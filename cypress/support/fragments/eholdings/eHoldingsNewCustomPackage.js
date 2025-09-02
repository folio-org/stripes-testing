import { Button, HTML, TextField, including, Select, Pane, Modal } from '../../../../interactors';

const nameField = TextField({ name: 'name' });
const contentTypeSelect = Select({ name: 'contentType' });
const saveAndCloseButton = Button({ type: 'submit' });
const cancelButton = Button('Cancel');
const closeIconButton = Button({ icon: 'times' });
const unsavedChangesModal = Modal({ id: 'navigation-modal' });
const unsavedChangesText = Modal().find(
  HTML('Your changes have not been saved. Are you sure you want to leave this page?'),
);
const keepEditingButton = Modal().find(Button('Keep editing'));
const continueWithoutSavingButton = Modal().find(Button('Continue without saving'));

export default {
  waitLoading: () => {
    cy.expect(Pane().exists());
  },

  fillInRequiredProperties: (packageName) => {
    cy.do(nameField.fillIn(packageName));
  },

  chooseContentType: (contentTypeValue) => {
    cy.do(contentTypeSelect.choose(contentTypeValue));
  },

  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
  },

  checkPackageCreatedCallout(calloutMessage = 'Custom package created.') {
    cy.expect(HTML(including(calloutMessage)).exists());
  },

  verifyButtonsDisabled: () => {
    cy.expect(cancelButton.has({ disabled: true }));
    cy.expect(saveAndCloseButton.has({ disabled: true }));
  },

  verifyButtonsEnabled: () => {
    cy.expect(cancelButton.has({ disabled: false }));
    cy.expect(saveAndCloseButton.has({ disabled: false }));
  },

  cancelChanges: () => {
    cy.expect(cancelButton.exists());
    cy.do(cancelButton.click());
  },

  verifyUnsavedChangesModalExists: () => {
    cy.expect(unsavedChangesModal.exists());
    cy.expect(unsavedChangesText.exists());
  },

  clickKeepEditing: () => {
    cy.expect(keepEditingButton.exists());
    cy.do(keepEditingButton.click());
  },

  clickContinueWithoutSaving: () => {
    cy.expect(continueWithoutSavingButton.exists());
    cy.do(continueWithoutSavingButton.click());
  },

  closeEditingWindow: () => {
    cy.expect(closeIconButton.exists());
    cy.do(closeIconButton.click());
  },

  verifyNameFieldValue: (expectedValue) => {
    cy.expect(nameField.has({ value: expectedValue }));
  },
};
