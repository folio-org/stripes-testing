import {
  Button,
  Callout,
  Checkbox,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Pane,
  TextField,
  including,
} from '../../../../../interactors';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../constants';

const manageAuthorityFilesPane = Pane('Manage authority files');
const newButton = manageAuthorityFilesPane.find(Button({ id: 'clickable-add-authorityfiles' }));
const firstRow = manageAuthorityFilesPane.find(MultiColumnListRow({ ariaRowIndex: 2 }));
const nameTextField = TextField({ placeholder: 'Name' });
const prefixTextField = TextField({ placeholder: 'Prefix' });
const hridStartsWithTextField = TextField({ placeholder: 'HRID starts with' });
const baseUrlTextField = TextField({ placeholder: 'Base URL' });
const activeCheckbox = Checkbox({ ariaLabel: including('Active') });
const sourceCell = MultiColumnListCell({ columnIndex: 5 });
const lastUpdatedCell = MultiColumnListCell({ columnIndex: 6 });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');
const tableHeaderTexts = [
  'Name*',
  'Prefix*',
  'HRID starts with*',
  'Base URL',
  'Active',
  'Source',
  'Last updated by',
];
const editButton = Button({ icon: 'edit' });
const deleteButton = Button({ icon: 'trash' });
const successSaveCalloutText = (authorityFileName) => `The authority file ${authorityFileName} has been successfully created.`;

const waitLoading = () => {
  cy.expect(newButton.has({ disabled: false }));
  cy.expect(firstRow.exists());
  cy.wait(3000);
};

const clickNewButton = () => {
  cy.do(newButton.click());
};

const verifyEditableRowAdded = () => {
  cy.expect(firstRow.find(nameTextField).has({ value: '' }));
  cy.expect(firstRow.find(prefixTextField).has({ value: '' }));
  cy.expect(firstRow.find(hridStartsWithTextField).has({ value: '' }));
  cy.expect(firstRow.find(baseUrlTextField).has({ value: '' }));
  cy.expect(firstRow.find(activeCheckbox).has({ checked: false }));
  cy.expect(firstRow.find(sourceCell).has({ content: 'Local' }));
  cy.expect(firstRow.find(lastUpdatedCell).has({ content: 'No value set-' }));
  cy.expect(firstRow.find(cancelButton).has({ disabled: false }));
  cy.expect(firstRow.find(saveButton).has({ disabled: false }));
};

const verifyTableHeaders = () => {
  tableHeaderTexts.forEach((headerText) => {
    cy.expect(manageAuthorityFilesPane.find(MultiColumnListHeader(headerText)).exists());
  });
};

const fillName = (name) => {
  cy.do(firstRow.find(nameTextField).fillIn(name));
  cy.expect(firstRow.find(nameTextField).has({ value: name }));
};

const fillPrefix = (prefix) => {
  cy.do(firstRow.find(prefixTextField).fillIn(prefix));
  cy.expect(firstRow.find(prefixTextField).has({ value: prefix }));
};

const fillHridStartsWith = (startsWith) => {
  cy.do(firstRow.find(hridStartsWithTextField).fillIn(startsWith));
  cy.expect(firstRow.find(hridStartsWithTextField).has({ value: startsWith }));
};

const fillBaseUrl = (baseUrl) => {
  cy.do(firstRow.find(baseUrlTextField).fillIn(baseUrl));
  cy.expect(firstRow.find(baseUrlTextField).has({ value: baseUrl }));
};

const switchActiveCheckbox = (isChecked = true) => {
  cy.do(firstRow.find(activeCheckbox).click());
  cy.expect(firstRow.find(activeCheckbox).has({ checked: isChecked }));
};

const checkCancelButtonEnabled = (isEnabled = true) => {
  cy.expect(firstRow.find(cancelButton).has({ disabled: !isEnabled }));
};

const checkSaveButtonEnabled = (isEnabled = true) => {
  cy.expect(firstRow.find(saveButton).has({ disabled: !isEnabled }));
};

const clickSaveButton = () => {
  cy.do(firstRow.find(saveButton).click());
};

const checkAfterSave = (authorityFileName) => {
  cy.expect(Callout(successSaveCalloutText(authorityFileName)).exists());
};

export default {
  waitLoading,
  clickNewButton,
  verifyEditableRowAdded,
  verifyTableHeaders,
  fillName,
  fillPrefix,
  fillHridStartsWith,
  fillBaseUrl,
  switchActiveCheckbox,
  checkCancelButtonEnabled,
  checkSaveButtonEnabled,
  clickSaveButton,
  checkAfterSave,

  fillAllFields: (name, prefix, startsWith, baseUrl, isActive) => {
    fillName(name);
    fillPrefix(prefix);
    fillHridStartsWith(startsWith);
    fillBaseUrl(baseUrl);
    switchActiveCheckbox(isActive);
  },

  checkSourceFileExists(name, prefix, startsWith, baseUrl, isActive, lastUpdatedBy, isDeletable) {
    const targetRow = manageAuthorityFilesPane.find(MultiColumnListRow(including(name)));
    cy.expect([
      targetRow.find(MultiColumnListCell(prefix)).exists(),
      targetRow.find(MultiColumnListCell(startsWith)).exists(),
      targetRow.find(MultiColumnListCell(baseUrl)).exists(),
      targetRow.find(activeCheckbox).has({ checked: isActive, disabled: true }),
      targetRow.find(MultiColumnListCell(including(lastUpdatedBy))).exists(),
      targetRow.find(editButton).exists(),
    ]);
    if (isDeletable) cy.expect(targetRow.find(deleteButton).exists());
  },

  setAllDefaultFOLIOFilesToActiveViaAPI() {
    Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((fileName) => {
      cy.getAuthoritySourceFileDataViaAPI(fileName).then((body) => {
        cy.setActiveAuthoritySourceFileViaAPI(body.id, body._version + 1);
      });
    });
  },

  unsetAllDefaultFOLIOFilesAsActiveViaAPI() {
    Object.values(DEFAULT_FOLIO_AUTHORITY_FILES).forEach((fileName) => {
      cy.getAuthoritySourceFileDataViaAPI(fileName).then((body) => {
        cy.setActiveAuthoritySourceFileViaAPI(body.id, body._version + 1, false);
      });
    });
  },
};
