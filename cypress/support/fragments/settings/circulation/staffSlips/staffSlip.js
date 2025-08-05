import { including } from '@interactors/html';
import {
  Button,
  KeyValue,
  MetaSection,
  Pane,
  matching,
  Modal,
  PaneContent,
  PaneSet,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';
import EditStaffClips from '../../../circulation/editStaffClips';

const editButton = Button({ id: 'clickable-edit-item' });
const previewButton = Button('Preview');
const previewModal = Modal({ id: 'preview-modal' });
const textCheck = 'The Wines of Italyc.2';
const staffSlipPaneContent = PaneContent({ id: 'staff-slip-pane-content' });

export default {
  waitLoading(name) {
    cy.expect(Pane(name).exists());
    cy.wait(1000);
  },
  edit(name) {
    cy.expect(Pane(name).find(editButton).exists());
    cy.do(Pane(name).find(editButton).click());
    EditStaffClips.waitLoadingEditPane();
  },
  checkAfterUpdate(staffSlipType) {
    InteractorsTools.checkCalloutMessage(
      `The Staff slip ${staffSlipType} was successfully updated.`,
    );
    cy.expect(Pane(staffSlipType).exists());
  },
  verifyKeyValue(verifyKey, verifyValue) {
    cy.expect(KeyValue(verifyKey, { value: verifyValue }).exists());
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
  previewStaffClips: (name, text = textCheck) => {
    cy.do(Pane(name).find(previewButton).click());
    cy.wait(1000);
    cy.expect(Modal({ id: 'preview-modal', content: including(text) }).exists());
    cy.do(Button('Close').click());
    cy.expect(previewModal.absent());
  },
  previewStaffClipsAndPrint: (name, text = textCheck) => {
    cy.do(Pane(name).find(previewButton).click());
    cy.wait(1000);
    cy.expect(Modal({ id: 'preview-modal', content: including(text) }).exists());
    cy.window().then((win) => {
      cy.stub(win, 'print').as('print');
    });
    cy.do(previewModal.find(Button('Print')).click());
    // verify that window.print was called
    cy.get('@print').should('exist');
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
  checkUnknownUserInMetadata() {
    this.findPane().then((pane) => {
      cy.expect(
        pane.find(Button(matching(/^Record last updated: \d{1,2}\/\d{1,2}\/\d{2,4}/))).exists(),
      );
      cy.do(pane.find(Button(including('Record last updated'))).click());
      cy.wait(1000);
      cy.expect([
        pane.find(MetaSection({ updatedByText: including('Source: Unknown user') })).exists(),
        pane
          .find(
            MetaSection({
              createdText: matching(/^Record created: \d{1,2}\/\d{1,2}\/\d{2,4}/),
            }),
          )
          .exists(),
      ]);
    });
  },
};
