import { Button, Checkbox, Link, Modal, Section, TextArea } from '../../../../../interactors';
import RichTextEditor from '../../../../../interactors/rich-text-editor';
import InteractorsTools from '../../../utils/interactorsTools';

const routingListConfigurationSection = Section({ id: 'routing-list-configuration-template-pane' });
const previewModal = Modal({ id: 'preview-modal' });
const addTokenModal = Modal('Add token');
const cancelEditingConfirmationModal = Modal({ id: 'cancel-editing-confirmation' });
const cancelButton = Button('Cancel');

export default {
  waitLoading() {
    cy.expect(routingListConfigurationSection.exists());
  },

  edit() {
    cy.wait(2000);
    cy.do(routingListConfigurationSection.find(Button('Edit')).click());
  },

  editIsDisabled() {
    cy.wait(2000);
    cy.expect(routingListConfigurationSection.find(Button('Edit')).has({ disabled: true }));
  },

  preview() {
    cy.wait(2000);
    cy.do(routingListConfigurationSection.find(Button('Preview')).click());
    cy.expect(previewModal.exists());
  },

  save() {
    cy.do(Button({ id: 'routing-list-configuration-save-button' }).click());
    InteractorsTools.checkCalloutMessage(
      'The Routing list configuration notice template was successfully updated.',
    );
  },

  cancel() {
    cy.wait(2000);
    cy.do(cancelButton.click());
    cy.expect(cancelEditingConfirmationModal.exists());
    cy.do(Button({ id: 'clickable-cancel-editing-confirmation-cancel' }).click());
  },

  cancelAndKeepEditing() {
    cy.wait(2000);
    cy.do(cancelButton.click());
    cy.expect(cancelEditingConfirmationModal.exists());
    cy.do(Button({ id: 'clickable-cancel-editing-confirmation-confirm' }).click());
  },

  fillInfoSectionFields(descripription, body) {
    cy.wait(2000);
    cy.do(TextArea({ name: 'description' }).fillIn(descripription));
    cy.do(RichTextEditor().fillIn(body));
  },

  addLinkInBody: () => {
    cy.get('.ql-container > .ql-editor').type('{selectAll}');
    cy.do(Button({ ariaLabel: 'link' }).click());
    cy.get('.ql-action').click();
  },

  clickOnLinkInBody(linkName) {
    cy.wait(2000);
    cy.do(routingListConfigurationSection.find(Link(linkName)).click());
  },

  clickOnAddTokensInBody() {
    cy.wait(2000);
    cy.do(Button({ ariaLabel: 'token' }).click());
    cy.expect(addTokenModal.exists());
  },

  selectToken(tokenName) {
    cy.wait(2000);
    cy.do(Checkbox(tokenName).click());
  },

  addToken() {
    cy.wait(2000);
    cy.do(addTokenModal.find(Button('Add token')).click());
  },

  cancelAddToken() {
    cy.wait(2000);
    cy.do(addTokenModal.find(cancelButton).click());
  },

  clickOnLinkInPreview(linkName) {
    cy.wait(2000);
    cy.do(previewModal.find(Link(linkName)).click());
  },

  closePreviewModal() {
    cy.wait(2000);
    cy.do(previewModal.find(Button('Close')).click());
  },

  checkTokenInPreview(tokenName) {
    cy.wait(2000);
    cy.get('#preview-modal-content').contains(`${tokenName}`);
  },
};
