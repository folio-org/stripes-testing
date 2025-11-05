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
  SelectionList,
  MetaSection,
  or,
  some,
} from '../../../../../../interactors';

const collapseAllLink = Button('Collapse all');
const summaryAccordion = Accordion('Summary');
const bulkEditsAccordion = Accordion(or('Bulk edits for administrative data', 'Bulk edits'));
const nameField = summaryAccordion.find(TextField('Name*'));
const descriptionField = summaryAccordion.find(TextArea('Description'));
const lockProfileCheckbox = summaryAccordion.find(Checkbox({ id: 'lockProfile' }));
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');
const closeFormButton = Button({ icon: 'times' });
const optionsDropdown = Selection({ value: including('Select control') });
const actionsDropdown = Select({ dataTestID: 'select-actions-0' });
const secondActionsDropdown = Select({ dataTestID: 'select-actions-1' });
const dataTextArea = TextArea({ dataTestID: 'input-textarea-0' });
const locationLookupButton = Button('Location look-up');
const locationSelection = Selection({ name: 'locationId' });
const plusButton = Button({ icon: 'plus-sign' });
const garbageCanButton = Button({ icon: 'trash' });
const getTargetRow = (rowIndex = 0) => {
  return RepeatableFieldItem({ index: rowIndex });
};

export default {
  getTargetRow,
  actionsDropdown,
  secondActionsDropdown,
  bulkEditsAccordion,
  plusButton,
  garbageCanButton,

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

  verifyMetadataSectionExists() {
    cy.expect(summaryAccordion.find(MetaSection({ open: false })).exists());
  },

  verifySummaryAccordionElements(isLockProfileCheckboxDisabled = true) {
    cy.expect([
      nameField.exists(),
      descriptionField.exists(),
      lockProfileCheckbox.has({ checked: false, disabled: isLockProfileCheckboxDisabled }),
    ]);
  },

  clickLockProfileCheckbox() {
    cy.do(lockProfileCheckbox.click());
  },

  clickCloseFormButton() {
    cy.do(closeFormButton.click());
  },

  verifyLockProfileCheckboxChecked(isChecked, isDisabled = false) {
    cy.expect(lockProfileCheckbox.has({ checked: isChecked, disabled: isDisabled }));
  },

  verifyBulkEditsAccordionElements() {
    cy.expect([
      bulkEditsAccordion.find(HTML(including('Options\n*'))).exists(),
      optionsDropdown.exists(),
      bulkEditsAccordion.find(HTML(including('Actions'))).exists(),
      bulkEditsAccordion.find(plusButton).has({ disabled: false }),
      bulkEditsAccordion.find(garbageCanButton).has({ disabled: true }),
    ]);
  },

  fillProfileName(name) {
    cy.do(nameField.fillIn(name));
    cy.expect(nameField.has({ value: name }));
  },

  verifyProfileNameValue(expectedValue) {
    cy.expect(nameField.has({ value: expectedValue }));
  },

  fillDescription(description) {
    cy.do(descriptionField.fillIn(description));
    cy.expect(descriptionField.has({ value: description }));
  },

  clickSelectOptionDropdown(rowIndex = 0) {
    cy.get('[class^="repeatableFieldItem-"]')
      .eq(rowIndex)
      .find('[class^="selectionControlContainer"]')
      .contains('Select control')
      .eq(0)
      .click();
  },

  selectOption(option, rowIndex = 0) {
    this.clickSelectOptionDropdown(rowIndex);

    cy.get('[class^="selectionListRoot"]:not([hidden])').find('li').contains(option).click();

    cy.wait(500);
  },

  verifySelectedOption(option, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(optionsDropdown)
        .has({ singleValue: option }),
    );
  },

  selectAction(action, rowIndex = 0) {
    cy.do(bulkEditsAccordion.find(getTargetRow(rowIndex)).find(actionsDropdown).choose(action));
    cy.wait(500);
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(actionsDropdown)
        .has({ checkedOptionText: action }),
    );
  },

  verifySelectedAction(action, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(actionsDropdown)
        .has({ checkedOptionText: action }),
    );
  },

  selectSecondAction(action, rowIndex = 0) {
    cy.do(
      bulkEditsAccordion.find(getTargetRow(rowIndex)).find(secondActionsDropdown).choose(action),
    );
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(secondActionsDropdown)
        .has({ checkedOptionText: action }),
    );
  },

  verifySelectedSecondAction(action, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(secondActionsDropdown)
        .has({ checkedOptionText: action }),
    );
  },

  verifySelectActionDisabled(action, rowIndex = 0) {
    cy.expect(
      getTargetRow(rowIndex)
        .find(actionsDropdown)
        .has({ disabled: true, checkedOptionText: action }),
    );
  },

  verifySelectSecondActionDisabled(action, rowIndex = 0) {
    cy.expect(
      getTargetRow(rowIndex)
        .find(Select({ dataTestID: 'select-actions-1' }))
        .has({ disabled: true, checkedOptionText: action }),
    );
  },

  selectLocation(location, rowIndex = 0) {
    cy.do(getTargetRow(rowIndex).find(locationSelection).choose(location));
  },

  clickLocationLookup(rowIndex = 0) {
    cy.do(getTargetRow(rowIndex).find(locationLookupButton).click());
    cy.wait(1000);
  },

  clickPlusButton(rowIndex = 0) {
    cy.do(bulkEditsAccordion.find(getTargetRow(rowIndex)).find(plusButton).click());
  },

  clickGarbageCanButton(rowIndex = 0) {
    cy.do(bulkEditsAccordion.find(getTargetRow(rowIndex)).find(garbageCanButton).click());
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
    cy.expect(bulkEditsAccordion.find(getTargetRow(rowIndex)).find(actionsDropdown).exists());
  },

  verifyDataColumnAppears() {
    cy.expect(bulkEditsAccordion.find(HTML(including('Data\n*'))).exists());
  },

  verifySelectLocationDropdownExists(rowIndex = 0) {
    cy.expect(getTargetRow(rowIndex).find(Button('Select control\nSelect location')).exists());
  },

  verifyLocationValue(value, rowIndex = 0) {
    cy.expect(
      getTargetRow(rowIndex)
        .find(Selection({ singleValue: value }))
        .visible(),
    );
  },

  verifyAddedNewBulkEditRow(rowIndex = 1) {
    cy.expect([
      getTargetRow(rowIndex - 1)
        .find(plusButton)
        .absent(),
      getTargetRow(rowIndex - 1)
        .find(garbageCanButton)
        .has({ disabled: false }),
      getTargetRow(rowIndex).find(plusButton).exists(),
      getTargetRow(rowIndex).find(garbageCanButton).exists(),
    ]);
  },

  fillTextInDataTextArea(text, rowIndex = 0) {
    cy.do(bulkEditsAccordion.find(getTargetRow(rowIndex)).find(dataTextArea).fillIn(text));
  },

  verifyTextInDataTextArea(text, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion.find(getTargetRow(rowIndex)).find(dataTextArea).has({ textContent: text }),
    );
  },

  checkStaffOnlyCheckbox(rowIndex = 0) {
    cy.do(getTargetRow(rowIndex).find(Checkbox('Staff only')).click());
  },

  clickOptionsSelection(rowIndex = 0) {
    cy.wait(1000);
    cy.do(
      bulkEditsAccordion
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(optionsDropdown)
        .open(),
    );
    cy.wait(1000);
  },

  verifyOptionExistsInSelectOptionDropdown(option, isExists = true) {
    cy.then(() => {
      return SelectionList({ placeholder: 'Filter options list' }).optionList();
    }).then((list) => {
      if (isExists) {
        expect(list).to.include(option);
      } else {
        expect(list).to.not.include(option);
      }
    });
  },

  verifyNoteTypeExistsInSelectOptionDropdown(noteType, rowIndex = 0, isExists = true) {
    if (isExists) {
      cy.expect(
        getTargetRow(rowIndex)
          .find(Select({ id: or('noteHoldingsType', 'noteType'), optionsText: some(noteType) }))
          .exists(),
      );
    } else {
      cy.expect(
        getTargetRow(rowIndex)
          .find(Select({ id: or('noteHoldingsType', 'noteType'), optionsText: some(noteType) }))
          .absent(),
      );
    }
  },

  selectNoteTypeWhenChangingIt(noteType, rowIndex = 0) {
    cy.do(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Select({ id: or('noteHoldingsType', 'noteType') }))
        .choose(noteType),
    );
  },

  verifyUrlRelationshipExistsInSelectOptionDropdown(
    urlRelationship,
    rowIndex = 0,
    isExists = true,
  ) {
    if (isExists) {
      cy.expect(
        getTargetRow(rowIndex)
          .find(Select({ id: 'urlRelationship', optionsText: some(urlRelationship) }))
          .exists(),
      );
    } else {
      cy.expect(
        getTargetRow(rowIndex)
          .find(Select({ id: 'urlRelationship', optionsText: some(urlRelationship) }))
          .absent(),
      );
    }
  },

  selectUrlRelationshipType(urlRelationship, rowIndex = 0) {
    cy.do(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Select({ id: 'urlRelationship' }))
        .choose(urlRelationship),
    );
  },
};
