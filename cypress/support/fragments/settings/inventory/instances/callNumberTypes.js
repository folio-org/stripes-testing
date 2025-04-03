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
  deweyDecimalclassification: 'Dewey Decimal classification',
  libraryOfCongressClassification: 'Library of Congress Classification',
  nationalLibraryOfMedicineClassification: 'National Library of Medicine Classification',
  otherScheme: 'Other scheme',
  superintendentOfDocumentsClassification: 'Superintendent of Documents classification',
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
};

export const CallNumberTypes = {
  ...Actions,
  ...Assertions,
  ...API,
};
