import { Button, HTML, TextField, including, Select, Pane } from '../../../../interactors';

const nameField = TextField({ name: 'name' });
const contentTypeSelect = Select({ name: 'contentType' });
const saveAndCloseButton = Button({ type: 'submit' });
const addDateRangeButton = Button('Add date range');
const startDateField = TextField('Start date');
const endDateField = TextField('End date');
const deleteDateRangeButton = Button({ icon: 'trash' });

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

  addDateRange: () => {
    cy.do(addDateRangeButton.click());
  },

  fillDateRange: (startDate, endDate) => {
    cy.do([startDateField.fillIn(startDate), endDateField.fillIn(endDate)]);
  },

  deleteDateRange: () => {
    cy.do(deleteDateRangeButton.click());
  },

  verifyDateRangeFieldsExist: () => {
    cy.expect([startDateField.exists(), endDateField.exists(), deleteDateRangeButton.exists()]);
  },

  verifyDateRangeFieldsAbsent: () => {
    cy.expect([startDateField.absent(), endDateField.absent(), deleteDateRangeButton.absent()]);
  },

  verifyAddDateRangeButtonExists: () => {
    cy.expect(addDateRangeButton.exists());
  },

  verifySaveButtonEnabled: () => {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
  },

  verifyDateRangeValues: (startDate, endDate) => {
    cy.expect([startDateField.has({ value: startDate }), endDateField.has({ value: endDate })]);
  },
};
