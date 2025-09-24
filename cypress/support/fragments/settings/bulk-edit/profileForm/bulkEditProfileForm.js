import {
  Button,
  HTML,
  TextField,
  TextArea,
  Checkbox,
  Select,
  Accordion,
  including,
  RepeatableFieldItem,
  Selection,
} from '../../../../../../interactors';

const collapseAllLink = Button('Collapse all');
const summaryAccordion = Accordion('Summary');
const bulkEditsAccordion = Accordion('Bulk edits');
const nameField = summaryAccordion.find(TextField('Name*'));
const descriptionField = summaryAccordion.find(TextArea('Description'));
const lockProfileCheckbox = summaryAccordion.find(Checkbox({ id: 'lockProfile' }));
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');
const closeFormButton = Button({ icon: 'times' });
const optionsDropdown = Selection({ value: including('Select control') });
const actionsDropdown = Select({ dataTestID: 'select-actions-0' });
const locationLookupButton = Button('Location look-up');
const plusButton = Button({ icon: 'plus-sign' });
const garbageCanButton = Button({ icon: 'trash' });
const targetRow = (rowIndex = 0) => {
  return bulkEditsAccordion.find(RepeatableFieldItem({ index: rowIndex }));
};

export default {
  verifyFormElements(title) {
    cy.expect([
      collapseAllLink.exists(),
      summaryAccordion.has({ open: true }),
      bulkEditsAccordion.has({ open: true }),
      saveAndCloseButton.has({ disabled: true }),
      cancelButton.has({ disabled: false }),
      closeFormButton.has({ disabled: false }),
    ]);
    cy.title().should('eq', `Bulk edit settings - ${title} - FOLIO`);
  },

  verifySummaryAccordionElements(isLockProfileCheckboxDisabled = true) {
    cy.expect([
      nameField.exists(),
      descriptionField.exists(),
      lockProfileCheckbox.has({ checked: false, disabled: isLockProfileCheckboxDisabled }),
    ]);
  },

  verifyBulkEditsAccordionElements() {
    cy.expect([
      bulkEditsAccordion.find(HTML(including('Options\n*'))).exists(),
      optionsDropdown.exists(),
      bulkEditsAccordion.find(HTML(including('Actions'))).exists(),
      plusButton.has({ disabled: false }),
      garbageCanButton.has({ disabled: true }),
    ]);
  },

  fillProfileName(name) {
    cy.do(nameField.fillIn(name));
    cy.expect(nameField.has({ value: name }));
  },

  fillDescription(description) {
    cy.do(descriptionField.fillIn(description));
    cy.expect(descriptionField.has({ value: description }));
  },

  selectOption(option, rowIndex = 0) {
    cy.do(targetRow(rowIndex).find(optionsDropdown).choose(option));
    cy.expect(targetRow(rowIndex).find(optionsDropdown).has({ singleValue: option }));
  },

  selectAction(action, rowIndex = 0) {
    cy.do(targetRow(rowIndex).find(actionsDropdown).choose(action));
    cy.expect(targetRow(rowIndex).find(actionsDropdown).has({ checkedOptionText: action }));
  },

  clickLocationLookup(rowIndex = 0) {
    cy.do(targetRow(rowIndex).find(locationLookupButton).click());
  },

  clickPlusButton(rowIndex = 0) {
    cy.do(targetRow(rowIndex).find(plusButton).click());
  },

  clickSaveAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  clickCancel() {
    cy.do(cancelButton.click());
  },

  verifySaveButtonDisabled(isDisabled = true) {
    cy.expect(saveAndCloseButton.has({ disabled: isDisabled }));
  },

  verifyActionsColumnAppears(rowIndex = 0) {
    cy.expect(bulkEditsAccordion.find(HTML(including('Actions\n*'))).exists());
    cy.expect(targetRow(rowIndex).find(actionsDropdown).exists());
  },

  verifyDataColumnAppears() {
    cy.expect(bulkEditsAccordion.find(HTML(including('Data\n*'))).exists());
  },

  verifySelectLocationDropdownExists(rowIndex = 0) {
    cy.expect(targetRow(rowIndex).find(Button('Select control\nSelect location')).exists());
  },

  verifyLocationValue(value, rowIndex = 0) {
    cy.expect(
      targetRow(rowIndex)
        .find(Selection({ singleValue: value }))
        .visible(),
    );
  },

  verifyAddedNewBulkEditRow(rowIndex = 1) {
    cy.expect([
      targetRow(rowIndex - 1)
        .find(plusButton)
        .absent(),
      targetRow(rowIndex - 1)
        .find(garbageCanButton)
        .has({ disabled: false }),
      targetRow(rowIndex).find(plusButton).exists(),
      targetRow(rowIndex).find(garbageCanButton).exists(),
    ]);
  },
};
