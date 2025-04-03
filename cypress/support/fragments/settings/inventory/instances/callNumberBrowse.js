import {
  Button,
  Pane,
  PaneContent,
  NavListItem,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiSelectOption,
  MultiSelect,
  MultiSelectMenu,
  including,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const sectionName = 'Call number browse';

const elements = {
  sectionName: 'Call number browse',
  navigationPane: PaneContent({ id: 'app-settings-nav-pane-content' }),
  callNumberBrowsePane: Pane(sectionName),
  editButton: Button({ icon: 'edit' }),
  cancelButton: Button('Cancel'),
  saveButton: Button('Save'),

  getTargetRowByName(callNumberName) {
    return this.callNumberBrowsePane.find(
      MultiColumnListRow({ innerHTML: including(callNumberName), isContainer: true }),
    );
  },
  callNumberTypesDropdown: MultiSelect({
    label: including('Call number types'),
  }),
};

const Assertions = {
  validateCallNumberBrowsePaneOpened() {
    cy.expect(elements.callNumberBrowsePane.exists());
  },
  validateSaveButtonStatusForItem({ itemName, isEnabled }) {
    const targetRow = elements.getTargetRowByName(itemName);
    cy.expect(targetRow.find(elements.saveButton).has({ disabled: !isEnabled }));
  },
  validateCancelButtonStatusForItem({ itemName, isEnabled }) {
    const targetRow = elements.getTargetRowByName(itemName);
    cy.expect(targetRow.find(elements.cancelButton).has({ disabled: !isEnabled }));
  },

  validateEditButtonForItemExists(itemName) {
    const targetRow = elements.getTargetRowByName(itemName);
    cy.expect(targetRow.find(elements.editButton).exists());
  },

  validateOptionSelectedInCallNumberTypesDropdown(itemName, option) {
    const selectedOptions = Array.isArray(option) ? option : [option];
    const targetRow = elements.getTargetRowByName(itemName);
    cy.expect(targetRow.find(MultiSelect({ selected: selectedOptions })).exists());
  },
  validateCallNumberTypesDropdownExpanded(itemName) {
    const targetRow = elements.getTargetRowByName(itemName);
    cy.expect(targetRow.find(elements.callNumberTypesDropdown).has({ open: true }));
  },
  validateCallNumberUpdateMessageSuccess(itemName) {
    InteractorsTools.checkCalloutMessage(
      `The call number browse type ${itemName} was successfully updated`,
    );
  },

  validateCallNumberBrowseRowInTable(itemName, callNumberTypes) {
    const targetRow = elements.getTargetRowByName(itemName);
    cy.expect([
      targetRow.find(MultiColumnListCell(itemName)).exists(),
      targetRow.find(MultiColumnListCell(callNumberTypes)).exists(),
      targetRow.find(elements.editButton).exists(),
    ]);
  },
};

const Actions = {
  openCallNumberBrowse() {
    cy.do(elements.navigationPane.find(NavListItem(sectionName)).click());
  },

  clickEditButtonForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.do(targetRow.find(elements.editButton).click());
  },
  clickSaveButtonForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.do(targetRow.find(elements.saveButton).click());
  },

  expandCallNumberTypeDropdownOption(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.do(targetRow.find(elements.callNumberTypesDropdown).toggle());
    cy.expect(targetRow.find(elements.callNumberTypesDropdown).has({ open: true }));
  },

  selectCallNumberTypeDropdownOption(optionName) {
    cy.do(MultiSelectMenu().find(MultiSelectOption(optionName)).click());
  },

  setCallNumberTypeOptions(itemName, optionNames) {
    this.clickEditButtonForItem(itemName);
    this.expandCallNumberTypeDropdownOption(itemName);
    const optionsToSelect = Array.isArray(optionNames) ? optionNames : [optionNames];
    optionsToSelect.forEach((optionName) => {
      cy.wait(500);
      this.selectCallNumberTypeDropdownOption(optionName);
    });
    this.clickSaveButtonForItem(itemName);
  },
};

export const CallNumberBrowseSettings = {
  ...Actions,
  ...Assertions,
};
