import uuid from 'uuid';
import {
  Button,
  Pane,
  PaneContent,
  NavListItem,
  MultiColumnListCell,
  MultiColumnListRow,
  TextField,
  including,
  Modal,
} from '../../../../../../interactors';

const sectionName = 'Call number types';

export const CALL_NUMBER_TYPES_DEFAULT = {
  DEWEY_DECIMAL_CLASSIFICATION: 'Dewey Decimal classification',
  LIBRARY_OF_CONGRESS_CLASSIFICATION: 'Library of Congress classification',
  NATIONAL_LIBRARY_OF_MEDICINE_CLASSIFICATION: 'National Library of Medicine classification',
  OTHER_SCHEME: 'Other scheme',
  SUPERINTENDENT_OF_DOCUMENTS_CLASSIFICATION: 'Superintendent of Documents classification',
  UDC: 'UDC',
  LC_MODIFIED: 'LC Modified',
  MOYS: 'MOYS',
  SHELVED_SEPARATELY: 'Shelved separately',
  SHELVING_CONTROL_NUMBER: 'Shelving control number',
  SOURCE_SPECIFIED_IN_SUBFIELD_2: 'Source specified in subfield $2',
  TITLE: 'Title',
};

const elements = {
  navigationPane: PaneContent({ id: 'app-settings-nav-pane-content' }),
  callNumberTypesPane: Pane(sectionName),
  editButton: Button({ icon: 'edit' }),
  cancelButton: Button('Cancel'),
  saveButton: Button('Save'),
  newButton: Button('+ New'),
  deleteButton: Button({ icon: 'trash' }),
  deleteModal: Modal('Delete Call number type'),
  deleteButtonInModal: Button('Delete'),

  getTargetRowByName(callNumberName) {
    return this.callNumberTypesPane.find(
      MultiColumnListRow({ innerHTML: including(callNumberName), isContainer: true }),
    );
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
  clickNewButton() {
    cy.do(elements.newButton.click());
  },
  fillNameInputField(name, optionName = null) {
    if (optionName) {
      const targetRow = elements.getTargetRowByName(optionName);
      cy.do(targetRow.find(TextField()).fillIn(name));
    } else cy.do(elements.callNumberTypesPane.find(TextField()).fillIn(name));
  },
  clickDeleteButtonForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.do(targetRow.find(elements.deleteButton).click());
  },
  clickDeleteButtonInModal() {
    cy.do(elements.deleteModal.find(elements.deleteButtonInModal).click());
  },
};

const Assertions = {
  validateCallNumberTypesPaneOpened() {
    cy.expect(elements.callNumberTypesPane.exists());
  },
  validateSaveButtonIsDisabledForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.expect(targetRow.find(elements.saveButton).has({ disabled: true }));
  },
  validateSystemCallNumberTypes() {
    Object.values(CALL_NUMBER_TYPES_DEFAULT)
      .slice(0, 5)
      .forEach((typeName) => {
        const targetRow = elements.getTargetRowByName(typeName);
        cy.expect([
          targetRow.exists(),
          targetRow.find(elements.editButton).absent(),
          targetRow.find(elements.cancelButton).absent(),
        ]);
      });
  },
  checkEmptyRowAdded() {
    cy.expect([
      elements.callNumberTypesPane.find(TextField()).has({ hasValue: false }),
      elements.saveButton.has({ disabled: true }),
      elements.cancelButton.has({ disabled: false }),
      MultiColumnListCell('-', { columnIndex: 2, row: 2 }).exists(),
    ]);
  },
  validateItemView(
    name,
    source = 'local',
    isEditable = true,
    isDeletable = true,
    lastUpdated = null,
  ) {
    const targetRow = elements.getTargetRowByName(name);
    cy.expect([
      targetRow.find(MultiColumnListCell(name, { columnIndex: 0 })).exists(),
      targetRow.find(MultiColumnListCell(source, { columnIndex: 1 })).exists(),
      isEditable
        ? targetRow.find(elements.editButton).exists()
        : targetRow.find(elements.editButton).absent(),
      isDeletable
        ? targetRow.find(elements.deleteButton).exists()
        : targetRow.find(elements.deleteButton).absent(),
      targetRow.find(elements.cancelButton).absent(),
      targetRow.find(elements.saveButton).absent(),
    ]);
    if (lastUpdated) {
      cy.expect(targetRow.find(MultiColumnListCell(lastUpdated, { columnIndex: 2 })).exists());
    }
  },
  validateItemEdit(
    name,
    source = 'local',
    saveButtonActive = false,
    cancelButtonActive = true,
    lastUpdated = null,
  ) {
    const targetRow = elements.getTargetRowByName(name);
    cy.expect([
      targetRow.find(TextField()).has({ value: name }),
      targetRow.find(MultiColumnListCell(source, { columnIndex: 1 })).exists(),
      saveButtonActive
        ? targetRow.find(elements.saveButton).exists()
        : targetRow.find(elements.saveButton).has({ disabled: true }),
      cancelButtonActive
        ? targetRow.find(elements.cancelButton).exists()
        : targetRow.find(elements.cancelButton).has({ disabled: true }),
    ]);
    if (lastUpdated) {
      cy.expect(targetRow.find(MultiColumnListCell(lastUpdated, { columnIndex: 2 })).exists());
    }
  },
  validateDeleteModal(isShown = true) {
    if (isShown) {
      cy.expect([
        elements.deleteModal.exists(),
        elements.deleteModal.find(elements.deleteButtonInModal).exists(),
        elements.deleteModal.find(elements.cancelButton).exists(),
      ]);
    } else cy.expect(elements.deleteModal.absent());
  },
  checkItemShown(name, isShown = true) {
    if (isShown) cy.expect(MultiColumnListCell(name).exists());
    else cy.expect(MultiColumnListCell(name).absent());
  },
};

const API = {
  getCallNumberTypesViaAPI() {
    cy.okapiRequest({
      path: 'call-number-types?limit=2000&query=cql.allRecords=1',
      isDefaultSearchParamsRequired: false,
    }).then((response) => {
      cy.wrap(response.body.callNumberTypes).as('callNumberTypes');
    });
    return cy.get('@callNumberTypes');
  },
  createCallNumberTypeViaApi({ id, name, source }) {
    const payload = {
      id: id || uuid(),
      name: name || 'Test call number type',
      source: source || 'local',
    };
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'call-number-types',
        body: payload,
        isDefaultSearchParams: false,
      })
      .then((res) => {
        return res.body.id;
      });
  },
  deleteLocalCallNumberTypeViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `call-number-types/${id}`,
    });
  },

  deleteCallNumberTypesLike(name) {
    return this.getCallNumberTypesViaAPI().then((callNumberTypes) => {
      callNumberTypes
        .filter((callNumberType) => {
          return callNumberType.name.includes(name);
        })
        .map((callNumberType) => {
          return this.deleteLocalCallNumberTypeViaApi(callNumberType.id);
        });
    });
  },
};

export const CallNumberTypes = {
  ...Actions,
  ...Assertions,
  ...API,
};
