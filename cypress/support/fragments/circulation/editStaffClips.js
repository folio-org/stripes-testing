import { including } from 'bigtest';
import {
  Button,
  TextArea,
  NavListItem,
  Checkbox,
  Modal,
  RichEditor,
  Pane,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const editButton = Button({ id: 'clickable-edit-item' });
const staffClipsDescripton = TextArea({ id: 'input-staff-slip-description' });
const textCheck = 'The Wines of Italyc.2';
const saveButton = Button('Save & close');
const staffClipsEditor = RichEditor();

export default {
  defaultUiEditStaffClips: {
    description: 'Created by autotest team',
  },
  chooseStaffClip(name) {
    cy.do(NavListItem(name).click());
  },
  openLastUpdateInfo() {
    cy.do(Button(including('Record last updated')).click());
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
    cy.do(Button({ className: 'ql-token' }).click());
    cy.wrap(tokens).each((token) => {
      cy.do(Checkbox(token).click());
    });
    cy.do(Button('Add token').click());
  },
  fillStaffClips: (editStaffClipsHold) => {
    cy.do([
      staffClipsDescripton.fillIn(editStaffClipsHold.description),
      Button({ className: 'ql-token' }).click(),
      Checkbox('item.title').click(),
      Checkbox('item.copy').click(),
      Button('Add token').click(),
      saveButton.click(),
    ]);
  },
  previewStaffClips: () => {
    cy.do([Button('Preview').click(), Button('Close').click()]);
    cy.expect(Modal({ id: 'preview-modal' }).exists(textCheck));
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
    cy.do(staffClipsEditor.fillIn('{selectAll}{backspace}'));
    cy.do(staffClipsDescripton.fillIn('{selectAll}{backspace}'));
    cy.do(saveButton.click());
  },
  saveAndClose: () => {
    cy.do(saveButton.click());
  },
  checkAfterUpdate(staffSlipType) {
    InteractorsTools.checkCalloutMessage(
      `The Staff slip ${staffSlipType} was successfully updated.`,
    );
    cy.expect(Pane(staffSlipType).exists());
  },
  editAndClearHold() {
    this.editHold();
    this.clearStaffClips();
  },
  editAndClearPickslip() {
    cy.do(Button({ icon: 'times' }).click());
    this.editPickslip();
    this.clearStaffClips();
  },
  editAndClearRequestDelivery() {
    cy.do(Button({ icon: 'times' }).click());
    this.editRequestDelivery();
    this.clearStaffClips();
  },
  editAndClearTransit() {
    cy.do(Button({ icon: 'times' }).click());
    this.editTransit();
    this.clearStaffClips();
  },
  collapseAll() {
    cy.do(Button('Collapse all').click());
    cy.wrap(['General information', 'Template content']).each((accordion) => {
      cy.expect(Button(accordion).has({ ariaExpanded: 'false' }));
    });
  },
  expandAll() {
    cy.do(Button('Expand all').click());
    cy.wrap(['General information', 'Template content']).each((accordion) => {
      cy.expect(Button(accordion).has({ ariaExpanded: 'true' }));
    });
  },
};
