import {
  Button,
  Callout,
  Checkbox,
  EditableListRow,
  Form,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Pane,
  TextField,
  including,
} from '../../../../../interactors';
import { DEFAULT_FOLIO_AUTHORITY_FILES, AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../constants';

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
const successSaveCalloutText = (authorityFileName) => {
  return `The authority file ${authorityFileName} has been successfully created.`;
};
const successSaveEditedFileCalloutText = (authorityFileName) => {
  return `The authority file ${authorityFileName} has been successfully updated.`;
};

const waitLoading = () => {
  cy.expect(newButton.has({ disabled: false }));
  cy.expect(firstRow.exists());
  cy.wait(3000);
};

const clickNewButton = () => {
  cy.do(newButton.click());
};

const clickEditButton = (authorityFileName) => {
  const targetRow = manageAuthorityFilesPane.find(MultiColumnListRow(including(authorityFileName)));
  cy.do(targetRow.find(editButton).click());
};

const checkEditButtonInRow = (authorityFileName) => {
  const targetRow = manageAuthorityFilesPane.find(MultiColumnListRow(including(authorityFileName)));
  cy.expect(targetRow.find(editButton).exists());
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

const checkNewButtonEnabled = (isEnabled = true) => {
  cy.expect(newButton.has({ disabled: !isEnabled }));
};

const clickSaveButton = () => {
  cy.do(firstRow.find(saveButton).click());
};

const clickCancelButton = () => {
  cy.do(firstRow.find(cancelButton).click());
};

const checkAfterSave = (authorityFileName) => {
  cy.expect(Callout(successSaveCalloutText(authorityFileName)).exists());
};

const checkAfterSaveEditedFile = (authorityFileName) => {
  cy.expect(Callout(successSaveEditedFileCalloutText(authorityFileName)).exists());
};

const getEditableListRow = (rowNumber) => {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
};

export default {
  waitLoading,
  clickNewButton,
  clickEditButton,
  checkEditButtonInRow,
  verifyEditableRowAdded,
  verifyTableHeaders,
  fillName,
  fillPrefix,
  fillHridStartsWith,
  fillBaseUrl,
  switchActiveCheckbox,
  checkCancelButtonEnabled,
  checkSaveButtonEnabled,
  checkNewButtonEnabled,
  clickSaveButton,
  clickCancelButton,
  checkAfterSave,
  checkAfterSaveEditedFile,
  getEditableListRow,

  fillAllFields: (name, prefix, startsWith, baseUrl, isActive) => {
    fillName(name);
    fillPrefix(prefix);
    fillHridStartsWith(startsWith);
    fillBaseUrl(baseUrl);
    if (isActive) switchActiveCheckbox(isActive);
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

  checkSourceFileExistsByName(fileName, isExist = true) {
    if (isExist) {
      cy.expect(manageAuthorityFilesPane.find(MultiColumnListRow(including(fileName))).exists());
    } else {
      cy.expect(manageAuthorityFilesPane.find(MultiColumnListRow(including(fileName))).absent());
    }
  },

  checkErrorInField(authorityFileName, fieldName, errorMessage) {
    cy.do(
      TextField({ value: authorityFileName }).perform((element) => {
        const rowNumber = element.closest('[data-row-index]').getAttribute('data-row-index');
        const targetRow = manageAuthorityFilesPane.find(getEditableListRow(rowNumber));

        switch (fieldName) {
          case AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME:
            cy.expect(
              targetRow.find(nameTextField).has({ error: errorMessage, errorTextRed: true }),
            );
            break;
          case AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX:
            cy.expect(
              targetRow.find(prefixTextField).has({ error: errorMessage, errorTextRed: true }),
            );
            break;
          case AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH:
            cy.expect(
              targetRow
                .find(hridStartsWithTextField)
                .has({ error: errorMessage, errorTextRed: true }),
            );
            break;
          case AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL:
            cy.expect(
              targetRow.find(baseUrlTextField).has({ error: errorMessage, errorTextRed: true }),
            );
            break;
          default:
            break;
        }
      }),
    );
  },

  checkManageAuthorityFilesPaneExists(isExist = true) {
    if (isExist) {
      cy.expect(manageAuthorityFilesPane.exists());
    } else {
      cy.expect(manageAuthorityFilesPane.absent());
    }
  },

  clickSaveButtonAfterEditingFile(authorityFileName) {
    cy.do(
      TextField({ value: authorityFileName }).perform((element) => {
        const rowNumber = element.closest('[data-row-index]').getAttribute('data-row-index');
        cy.do(
          manageAuthorityFilesPane.find(getEditableListRow(rowNumber)).find(saveButton).click(),
        );
      }),
    );
  },

  clickCancelButtonAfterEditingFile(authorityFileName) {
    cy.do(
      TextField({ value: authorityFileName }).perform((element) => {
        const rowNumber = element.closest('[data-row-index]').getAttribute('data-row-index');
        cy.do(
          manageAuthorityFilesPane.find(getEditableListRow(rowNumber)).find(cancelButton).click(),
        );
      }),
    );
  },

  editField(authorityFileName, fieldName, fieldValue) {
    cy.do(
      TextField({ value: authorityFileName }).perform((element) => {
        const rowNumber = element.closest('[data-row-index]').getAttribute('data-row-index');
        const targetRow = manageAuthorityFilesPane.find(getEditableListRow(rowNumber));

        cy.do(targetRow.find(TextField({ placeholder: fieldName })).fillIn(fieldValue));
        cy.expect(targetRow.find(TextField({ placeholder: fieldName })).has({ value: fieldValue }));
        cy.expect(targetRow.find(cancelButton).has({ disabled: false }));
        cy.expect(targetRow.find(saveButton).has({ disabled: false }));
      }),
    );
  },

  checkRowEditableInEditMode(
    authorityFileName,
    prefix,
    hridStartsWith,
    baseUrl,
    isActive,
    source,
    createdByUser,
    isCancelButtonDisabled = false,
    isSaveButtonDisabled = true,
  ) {
    cy.do(
      TextField({ value: authorityFileName }).perform((element) => {
        const rowNumber = element.closest('[data-row-index]').getAttribute('data-row-index');
        const targetRow = manageAuthorityFilesPane.find(getEditableListRow(rowNumber));

        cy.expect(targetRow.find(nameTextField).has({ value: authorityFileName, disabled: false }));
        cy.expect(targetRow.find(prefixTextField).has({ value: prefix, disabled: false }));
        cy.expect(
          targetRow.find(hridStartsWithTextField).has({ value: hridStartsWith, disabled: false }),
        );
        cy.expect(targetRow.find(baseUrlTextField).has({ value: baseUrl, disabled: false }));
        cy.expect(targetRow.find(activeCheckbox).has({ checked: isActive, disabled: false }));
        cy.expect(targetRow.find(sourceCell).has({ content: source }));
        cy.expect(targetRow.find(MultiColumnListCell(including(createdByUser))).exists());
        cy.expect(targetRow.find(cancelButton).has({ disabled: isCancelButtonDisabled }));
        cy.expect(targetRow.find(saveButton).has({ disabled: isSaveButtonDisabled }));
      }),
    );
  },

  checkActionTableHeaderExists() {
    cy.get('#list-column-actions').should('exist').and('have.text', 'Actions');
  },

  checkAuthorityFilesTableExists(isExist = true) {
    if (isExist) {
      cy.expect(Form(including('Authority files')).exists());
    } else {
      cy.expect(Form(including('Authority files')).absent());
    }
  },

  switchActiveCheckboxInFile(authorityFileName, isChecked) {
    cy.do(
      TextField({ value: authorityFileName }).perform((element) => {
        const rowNumber = element.closest('[data-row-index]').getAttribute('data-row-index');
        const targetRow = manageAuthorityFilesPane.find(getEditableListRow(rowNumber));

        cy.do(targetRow.find(activeCheckbox).click());
        cy.expect(targetRow.find(activeCheckbox).has({ checked: isChecked }));
      }),
    );
  },

  checkSaveButtonEnabledInFile(authorityFileName, isEnabled = true) {
    cy.do(
      TextField({ value: authorityFileName }).perform((element) => {
        const rowNumber = element.closest('[data-row-index]').getAttribute('data-row-index');
        const targetRow = manageAuthorityFilesPane.find(getEditableListRow(rowNumber));

        cy.expect(targetRow.find(saveButton).has({ disabled: !isEnabled }));
      }),
    );
  },

  checkCancelButtonEnabledInFile(authorityFileName, isEnabled = true) {
    cy.do(
      TextField({ value: authorityFileName }).perform((element) => {
        const rowNumber = element.closest('[data-row-index]').getAttribute('data-row-index');
        const targetRow = manageAuthorityFilesPane.find(getEditableListRow(rowNumber));

        cy.expect(targetRow.find(cancelButton).has({ disabled: !isEnabled }));
      }),
    );
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

  setAuthorityFileToActiveViaApi(fileName) {
    cy.getAuthoritySourceFileDataViaAPI(fileName).then((body) => {
      cy.setActiveAuthoritySourceFileViaAPI(body.id, body._version + 1);
    });
  },

  unsetAuthorityFileAsActiveViaApi(fileName) {
    cy.getAuthoritySourceFileDataViaAPI(fileName).then((body) => {
      cy.setActiveAuthoritySourceFileViaAPI(body.id, body._version + 1, false);
    });
  },
};
