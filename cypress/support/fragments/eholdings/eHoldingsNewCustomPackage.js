import {
  Button,
  HTML,
  IconButton,
  Popover,
  TextArea,
  TextField,
  including,
  Select,
  Pane,
} from '../../../../interactors';

const nameField = TextField({ name: 'name' });
const contentTypeSelect = Select({ name: 'contentType' });
const accessStatusTypeSelect = Select({ id: 'eholdings-access-type-id' });
const packageDisplayNameField = TextArea('Package display name');
const customAlternateNamesLabel = HTML('Custom alternate names');
const packageDisplayNameLabel = HTML('Package display name');
const infoIconButton = IconButton({ icon: 'info' });
const saveAndCloseButton = Button({ type: 'submit' });
const addDateRangeButton = Button('Add date range');
const startDateField = TextField('Start date');
const endDateField = TextField('End date');
const deleteDateRangeButton = Button({ icon: 'trash' });
const addAlternateNameButton = Button('Add alternate name');
const alternateNameField = (index = 0) => TextArea({ name: `customAltNames[${index}].altName` });
const alternateNamesInfoPopoverText =
  'Add familiar alternate names to help staff and patrons easily search for and find packages.';
const packageDisplayNameInfoPopoverText =
  'Enter the Package name to display on search results and the detail record.';

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

  chooseAccessStatusType: (accessStatusTypeName) => {
    cy.do(accessStatusTypeSelect.choose(accessStatusTypeName));
    cy.expect(accessStatusTypeSelect.has({ checkedOptionText: accessStatusTypeName }));
  },

  fillPackageDisplayName: (value) => {
    cy.do(packageDisplayNameField.fillIn(value));
  },

  verifyCustomAlternateNamesInfoPopover: () => {
    cy.do(customAlternateNamesLabel.find(infoIconButton).click());
    cy.expect(Popover({ content: including(alternateNamesInfoPopoverText) }).exists());
  },

  verifyPackageDisplayNameInfoPopover: () => {
    cy.do(packageDisplayNameLabel.find(infoIconButton).click());
    cy.expect(Popover({ content: including(packageDisplayNameInfoPopoverText) }).exists());
  },

  verifyNewCustomPackageFormFields: () => {
    cy.expect([
      nameField.exists(),
      contentTypeSelect.exists(),
      packageDisplayNameField.exists(),
      customAlternateNamesLabel.exists(),
      addAlternateNameButton.exists(),
      addDateRangeButton.exists(),
    ]);
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

  verifyNoCoverageDatesMessage: () => {
    cy.expect(HTML(including('No date ranges set. Saving will remove custom coverage.')).exists());
  },

  checkPackageUpdatedCallout() {
    cy.expect(HTML(including('Package saved.')).exists());
  },

  clickAddAlternateNameButton: () => {
    cy.do(addAlternateNameButton.click());
    cy.expect(alternateNameField().exists());
  },

  addAlternateName(alternateName, { index = 0, clickAddButton = true } = {}) {
    if (clickAddButton) this.clickAddAlternateNameButton();
    cy.do(alternateNameField(index).fillIn(alternateName));
  },
};
