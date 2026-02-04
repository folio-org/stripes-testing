import {
  Button,
  Pane,
  PaneContent,
  NavListItem,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiSelectOption,
  MultiSelect,
  MultiSelectMenu,
  IconButton,
  Popover,
  including,
  ListItem,
  and,
} from '../../../../../../interactors';
import { CallNumberTypes } from './callNumberTypes';
import InteractorsTools from '../../../../utils/interactorsTools';

const sectionName = 'Call number browse';
export const callNumbersIds = {
  'Call numbers (all)': 'all',
  'Library of Congress classification': 'lc',
  'Dewey Decimal classification': 'dewey',
  'National Library of Medicine classification': 'nlm',
  'Other scheme': 'other',
  'Superintendent of Documents classification': 'sudoc',
};
const tableHeaderTexts = ['Name', 'Call number types', 'Actions'];
const typesPopoverText =
  'Please note that if no call number types are selected for a browse option, this option will display all call number types.';

const elements = {
  sectionName: 'Call number browse',
  navigationPane: PaneContent({ id: 'app-settings-nav-pane-content' }),
  callNumberBrowsePane: Pane(sectionName),
  editButton: Button({ icon: 'edit' }),
  cancelButton: Button('Cancel'),
  saveButton: Button('Save'),
  selectedOptionsRemoveBtn: 'ul[class*=multiSelectValueList] button[aria-label="times"]',
  typesPopoverIcon: MultiColumnListHeader(tableHeaderTexts[1]).find(IconButton('info')),

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
    cy.expect(
      targetRow
        .find(
          MultiSelect({
            selectedCount: selectedOptions.length,
            selected: and(...selectedOptions.map((opt) => including(opt))),
          }),
        )
        .exists(),
    );
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

  validateCallNumberBrowseRowInTable(itemName, callNumberTypes, isTypePresent = true) {
    const targetRow = elements.getTargetRowByName(itemName);
    const typeAssertion = isTypePresent
      ? targetRow.find(MultiColumnListCell(callNumberTypes)).exists()
      : targetRow.find(MultiColumnListCell(including(callNumberTypes))).absent();
    cy.expect([
      targetRow.find(MultiColumnListCell(itemName)).exists(),
      typeAssertion,
      targetRow.find(elements.editButton).exists(),
    ]);
  },

  validateMultipleTypesForCallNumberBrowseRowInTable(
    browseName,
    callNumberTypes,
    areTypesPresent = true,
  ) {
    const targetRow = elements.getTargetRowByName(browseName);
    cy.expect(targetRow.find(elements.editButton).exists());
    callNumberTypes.forEach((callNumberType) => {
      if (areTypesPresent) cy.expect(targetRow.find(ListItem({ text: callNumberType })).exists());
      else cy.expect(targetRow.find(ListItem({ text: callNumberType })).absent());
    });
  },

  validateAvailableCallNumberTypeOption(optionName) {
    cy.expect(MultiSelectMenu().find(MultiSelectOption(optionName)).exists());
  },

  checkTableHeaders() {
    tableHeaderTexts.forEach((headerText, index) => {
      cy.expect(
        elements.callNumberBrowsePane.find(MultiColumnListHeader(headerText, { index })).exists(),
      );
    });
  },

  checkInfoIconExists() {
    cy.expect(elements.callNumberBrowsePane.find(elements.typesPopoverIcon).exists());
  },

  checkPopoverMessage() {
    cy.expect(Popover({ content: typesPopoverText }).exists());
  },

  validateCallNumberBrowseTable(isEditable = true) {
    this.checkTableHeaders();
    Object.keys(callNumbersIds).forEach((callNumberBrowseName) => {
      const targetRow = elements.getTargetRowByName(callNumberBrowseName);
      cy.expect([
        targetRow.find(MultiColumnListCell(callNumberBrowseName, { columnIndex: 0 })).exists(),
        isEditable
          ? targetRow.find(elements.editButton).exists()
          : targetRow.find(elements.editButton).absent(),
      ]);
    });
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

  clearAllSelectedCallNumberTypes(itemName) {
    cy.do(
      elements.getTargetRowByName(itemName).perform((option) => {
        option.querySelectorAll(elements.selectedOptionsRemoveBtn).forEach((btn) => btn.click());
      }),
    );
  },

  selectCallNumberTypeDropdownOption(optionName) {
    cy.do(MultiSelectMenu().find(MultiSelectOption(optionName)).clickSegment());
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

  clickCancelButtonForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.do(targetRow.find(elements.cancelButton).click());
  },

  clickInfoIcon() {
    cy.do(elements.callNumberBrowsePane.find(elements.typesPopoverIcon).click());
  },
};

const API = {
  updateCallNumberBrowse({ callNumberBrowseId, callNumberTypes, shelvingAlgorithm }) {
    return cy.okapiRequest({
      path: `browse/config/instance-call-number/${callNumberBrowseId}`,
      method: 'PUT',
      body: {
        id: callNumberBrowseId,
        shelvingAlgorithm,
        typeIds: callNumberTypes,
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  getCallNumberBrowseConfigViaAPI() {
    return cy.okapiRequest({ path: 'browse/config/instance-call-number' });
  },

  assignCallNumberTypesViaApi({ name, callNumberTypes }) {
    this.getCallNumberBrowseConfigViaAPI().then((resp) => {
      const shelvingAlgorithm = resp.body.configs.filter(
        (config) => config.id === callNumbersIds[name],
      )[0].shelvingAlgorithm;
      CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
        const typeIds = types
          .filter((type) => callNumberTypes.includes(type.name))
          .map((type) => type.id);
        return this.updateCallNumberBrowse({
          callNumberBrowseId: callNumbersIds[name],
          callNumberTypes: typeIds,
          shelvingAlgorithm,
        });
      });
    });
  },
};

export const CallNumberBrowseSettings = {
  ...Actions,
  ...Assertions,
  ...API,
};
