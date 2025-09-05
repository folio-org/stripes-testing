import { Button, HTML, TextField, including, Select, Pane } from '../../../../interactors';

const nameField = TextField({ name: 'name' });
const contentTypeSelect = Select({ name: 'contentType' });
const saveAndCloseButton = Button({ type: 'submit' });

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

  verifyNameFieldValue: (expectedValue) => {
    cy.expect(nameField.has({ value: expectedValue }));
  },
};
