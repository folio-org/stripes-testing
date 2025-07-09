import { including } from '@interactors/html';
import {
  Button,
  Checkbox,
  Heading,
  KeyValue,
  MetaSection,
  Modal,
  NavListItem,
  Pane,
  PaneContent,
  PaneSet,
  TextArea,
  matching,
} from '../../../../interactors';
import richTextEditor from '../../../../interactors/rich-text-editor';
import InteractorsTools from '../../utils/interactorsTools';

const rootPane = Pane({ id: 'staff-slip-pane' });
const staffSlipPaneContent = PaneContent({ id: 'staff-slip-pane-content' });
const editButton = Button({ id: 'clickable-edit-item' });
const staffClipsDescription = TextArea({ id: 'input-staff-slip-description' });
const textCheck = 'The Wines of Italyc.2';
const saveButton = Button('Save & close');
const addTokenButton = Button('Add token');
const addTokenModal = Modal('Add token');

function clickCurlyBracketsButton() {
  cy.do(Button({ className: 'ql-token' }).click());
}
function checkTokenCheckbox(tokens) {
  cy.wrap(tokens).each((token) => {
    cy.do(Checkbox(token).click());
  });
}
function clickAddTokenButton() {
  cy.do(addTokenButton.click());
  cy.expect([addTokenModal.absent(), saveButton.has({ disabled: false })]);
}

export default {
  clickCurlyBracketsButton,
  checkTokenCheckbox,
  clickAddTokenButton,
  defaultUiEditStaffClips: {
    description: 'Created by autotest team',
  },
  waitLoadingEditPane() {
    cy.expect(rootPane.exists());
    cy.wait(1000);
  },
  waitLoading() {
    cy.expect(Heading('Staff slips').exists());
    cy.wait(1000);
  },
  findPane() {
    return cy.get('#root').then(($ele) => {
      let pane;
      if ($ele.find('#staff-slip-pane-content').length > 0) {
        pane = staffSlipPaneContent;
      } else {
        pane = PaneSet({ id: 'settings-module-display' });
      }
      return pane;
    });
  },
  chooseStaffClip(name) {
    cy.do(NavListItem(name).click());
    cy.expect(Pane(name).exists());
  },
  checkLastUpdateInfo(updatedBy = '', createdBy = '', updateTime) {
    this.findPane().then((pane) => {
      cy.expect(
        pane.find(Button(matching(/^Record last updated: \d{1,2}\/\d{1,2}\/\d{2,4}/))).exists(),
      );
      cy.do(pane.find(Button(including('Record last updated'))).click());
      cy.expect([
        pane.find(MetaSection({ updatedByText: including(`Source: ${updatedBy}`) })).exists(),
        pane
          .find(
            MetaSection({
              createdText: matching(/^Record created: \d{1,2}\/\d{1,2}\/\d{2,4}/),
            }),
          )
          .exists(),
        pane.find(MetaSection({ createdByText: including(`Source: ${createdBy}`) })).exists(),
      ]);
      if (updateTime) {
        cy.expect(pane.find(MetaSection({ createdText: including(updateTime) })).exists());
      }
    });
  },
  editHold() {
    cy.do([NavListItem('Hold').click(), editButton.click()]);
  },
  editPickslip() {
    cy.do([NavListItem('Pick slip').click(), editButton.click()]);
  },
  editRequestDelivery() {
    cy.do([NavListItem('Request delivery').click(), editButton.click()]);
  },
  editTransit() {
    cy.do([NavListItem('Transit').click(), editButton.click()]);
  },
  addToken: (tokens) => {
    clickCurlyBracketsButton();
    checkTokenCheckbox(tokens);
    clickAddTokenButton();
  },
  addTokenAndVerify(section, token) {
    clickCurlyBracketsButton();
    this.verifyAddTokenModal(section, token);
    cy.do(Checkbox(token).click());
    cy.expect([addTokenButton.has({ disabled: false }), Checkbox(token).has({ checked: true })]);
  },
  uncheckTokenAndVerify(token) {
    cy.do(Checkbox(token).click());
    cy.expect(Checkbox(token).has({ checked: false }));
  },
  verifyAddTokenModal(section, token) {
    cy.expect(addTokenModal.exists());
    cy.get('div[class*=categoryHeader]')
      .contains(section)
      .parent()
      .within(() => {
        cy.contains(token).should('exist');
      });
    cy.expect(addTokenButton.has({ disabled: true }));
  },
  fillStaffClips: (editStaffClipsHold) => {
    cy.do([
      staffClipsDescription.fillIn(editStaffClipsHold.description),
      Button({ className: 'ql-token' }).click(),
      Checkbox('item.title').click(),
      Checkbox('item.copy').click(),
      addTokenButton.click(),
      cy.wait(2000),
      saveButton.click(),
    ]);
    cy.wait(1000);
  },
  fillTemplateContent(content) {
    cy.do(richTextEditor().fillIn(content));
  },
  editDescription(description) {
    cy.do(staffClipsDescription.fillIn(description));
    cy.expect(staffClipsDescription.has({ textContent: including(description) }));
  },
  editTemplateContent(content) {
    cy.do(richTextEditor().fillIn(content));
    cy.expect(richTextEditor().has({ value: including(content) }));
  },
  previewStaffClips: () => {
    cy.do(rootPane.find(Button('Preview')).click());
    cy.wait(1000);
    cy.expect(Modal({ id: 'preview-modal' }).exists(textCheck));
    cy.do(Button('Close').click());
    cy.wait(1000);
  },
  checkPreview: (staffSlipType, displayText) => {
    cy.do(Button('Preview').click());
    cy.expect([
      Modal(`Preview of staff slip - ${staffSlipType}`).exists(),
      Modal({ content: including(displayText) }).exists(),
    ]);
    cy.do(Button('Close').click());
  },
  fillAndPreviewTemplate(editStaffClipsHold) {
    this.fillStaffClips(editStaffClipsHold);
    this.previewStaffClips();
  },
  clearStaffClips: () => {
    cy.get('.ql-container > .ql-editor').type('{selectAll}{backspace}');
    cy.do(staffClipsDescription.fillIn('{selectAll}{backspace}'));
    cy.do(saveButton.click());
  },
  saveAndClose: () => {
    cy.do(saveButton.click());
    cy.wait(1000);
    cy.expect(staffSlipPaneContent.absent());
  },
  checkAfterUpdate(staffSlipType) {
    InteractorsTools.checkCalloutMessage(
      `The Staff slip ${staffSlipType} was successfully updated.`,
    );
    cy.expect(Pane(staffSlipType).exists());
  },
  editAndClearHold() {
    this.editHold();
    cy.wait(500);
    this.clearStaffClips();
    cy.wait(500);
  },
  editAndClearPickslip() {
    cy.do(Button({ icon: 'times' }).click());
    cy.wait(500);
    this.editPickslip();
    cy.wait(500);
    this.clearStaffClips();
    cy.wait(500);
  },
  editAndClearRequestDelivery() {
    cy.do(Button({ icon: 'times' }).click());
    cy.wait(500);
    this.editRequestDelivery();
    cy.wait(500);
    this.clearStaffClips();
    cy.wait(500);
  },
  editAndClearTransit() {
    cy.do(Button({ icon: 'times' }).click());
    cy.wait(500);
    this.editTransit();
    cy.wait(500);
    this.clearStaffClips();
    cy.wait(500);
  },
  collapseAll() {
    this.findPane().then((pane) => {
      cy.do(pane.find(Button('Collapse all')).click());
      cy.wrap(['General information', 'Template content']).each((accordion) => {
        cy.expect(pane.find(Button(accordion)).has({ ariaExpanded: 'false' }));
      });
    });
  },
  expandAll() {
    this.findPane().then((pane) => {
      cy.do(pane.find(Button('Expand all')).click());
      cy.wrap(['General information', 'Template content']).each((accordion) => {
        cy.expect(pane.find(Button(accordion)).has({ ariaExpanded: 'true' }));
      });
    });
  },
  verifyKeyValue(verifyKey, verifyValue) {
    cy.expect(KeyValue(verifyKey, { value: verifyValue }).exists());
  },
  verifyTemplateContent(token) {
    cy.expect(richTextEditor().has({ value: `{{${token}}}` }));
  },
};
