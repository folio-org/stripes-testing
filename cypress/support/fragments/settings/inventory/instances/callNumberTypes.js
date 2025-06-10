import uuid from 'uuid';
import {
  Button,
  Pane,
  PaneContent,
  NavListItem,
  MultiColumnListRow,
  including,
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
};

const Assertions = {
  validateCallNumberTypesPaneOpened() {
    cy.expect(elements.callNumberTypesPane.exists());
  },
  validateSaveButtonIsDisabledForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.expect(targetRow.find(elements.saveButton).has({ disabled: true }));
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
