import {
  Button,
  Callout,
  Checkbox,
  EditableListRow,
  Form,
  HTML,
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Pane,
  TextField,
  including,
  matching,
  or,
} from '../../../../../interactors';
import {
  DEFAULT_FOLIO_AUTHORITY_FILES,
  AUTHORITY_FILE_TEXT_FIELD_NAMES,
  AUTHORITY_FILE_SOURCES,
} from '../../../constants';

const manageAuthorityFilesPane = Pane('Manage authority files');
const newButton = manageAuthorityFilesPane.find(Button({ id: 'clickable-add-authorityfiles' }));
const firstRow = manageAuthorityFilesPane.find(MultiColumnListRow({ ariaRowIndex: 2 }));
const nameTextField = TextField({ placeholder: AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME });
const prefixTextField = TextField({ placeholder: AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX });
const hridStartsWithTextField = TextField({
  placeholder: AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
});
const baseUrlTextField = TextField({ placeholder: AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL });
const activeCheckbox = Checkbox({ ariaLabel: including('Active') });
const sourceCell = MultiColumnListCell({ columnIndex: 5 });
const lastUpdatedCell = MultiColumnListCell({ columnIndex: 6 });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');
const confirmDeletionButton = Button('Yes, delete');
const tableHeaderTexts = [
  `${AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME}*`,
  `${AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX}*`,
  `${AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH}*`,
  AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
  'Active',
  'Source',
  'Last updated by',
  'Actions',
];
const editButton = Button({ icon: 'edit' });
const deleteButton = Button({ icon: 'trash' });
const tooltipButton = Button({ icon: 'info' });
const successSaveCalloutText = (authorityFileName) => {
  return `The authority file ${authorityFileName} has been successfully created.`;
};
const successSaveEditedFileCalloutText = (authorityFileName) => {
  return `The authority file ${authorityFileName} has been successfully updated.`;
};
const authorityFileDeletedCalloutText = (authorityFileName) => {
  return `Authority file ${authorityFileName} has been deleted.`;
};
const deleteModalMessage1 = (sourceFileName) => `${sourceFileName} will be deleted.`;
const deleteModalMessage2 =
  'Are you sure you want to delete this authority file? After deletion, new records will no longer be able to be assigned to this authority file';
const deleteModal = Modal('Delete authority file');
const cancelDeletionButton = Button('No, do not delete');

const waitLoading = () => {
  cy.expect(newButton.has({ disabled: false }));
  cy.expect(firstRow.exists());
  cy.wait(3000);
};

const clickNewButton = () => {
  cy.do(newButton.click());
};

const clickEditButton = (authorityFileName) => {
  const targetRow = manageAuthorityFilesPane.find(
    MultiColumnListRow(including(authorityFileName), { isContainer: true }),
  );

  cy.do(targetRow.find(editButton).click());
};

const clickDeleteButton = (authorityFileName) => {
  const targetRow = manageAuthorityFilesPane.find(
    MultiColumnListRow(including(authorityFileName), { isContainer: true }),
  );

  cy.do(targetRow.find(deleteButton).click());
};

const checkEditButtonInRow = (authorityFileName) => {
  const targetRow = manageAuthorityFilesPane.find(
    MultiColumnListRow(including(authorityFileName), { isContainer: true }),
  );

  cy.expect(targetRow.find(editButton).exists());
};

const verifyEditableRowAdded = () => {
  cy.expect(firstRow.find(nameTextField).has({ value: '' }));
  cy.expect(firstRow.find(prefixTextField).has({ value: '' }));
  cy.expect(firstRow.find(hridStartsWithTextField).has({ value: '' }));
  cy.expect(firstRow.find(baseUrlTextField).has({ value: '' }));
  cy.expect(firstRow.find(activeCheckbox).has({ checked: false }));
  cy.expect(firstRow.find(sourceCell).has({ content: AUTHORITY_FILE_SOURCES.LOCAL }));
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

const clickSaveButtonAfterCreationFile = () => {
  cy.do(firstRow.find(saveButton).click());
};

const clickCancelButton = () => {
  cy.do(firstRow.find(cancelButton).click());
};

const checkAfterSaveCreatedFile = (authorityFileName) => {
  cy.expect(Callout(successSaveCalloutText(authorityFileName)).exists());
};

const checkAfterSaveEditedFile = (authorityFileName) => {
  cy.expect(Callout(successSaveEditedFileCalloutText(authorityFileName)).exists());
};

const checkAfterDeletionFile = (authorityFileName) => {
  cy.expect(Callout(authorityFileDeletedCalloutText(authorityFileName)).exists());
};

const getEditableListRow = (rowNumber) => {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
};

const getTargetRowWithFile = (authorityFileName) => {
  return manageAuthorityFilesPane.find(
    MultiColumnListRow({ innerHTML: including(authorityFileName), isContainer: false }),
  );
};

const defaultFolioAuthorityFiles = [
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.ART_AND_ARCHITECTURE_THESAURUS,
    prefix: or('aat', 'aat,aatg,aatfg'),
    startsWith: '',
    baseUrl: 'http://vocab.getty.edu/aat/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.FACETED_APPLICATION_OF_SUBJECT_TERMINOLOGY,
    prefix: 'fst',
    startsWith: '',
    baseUrl: 'http://id.worldcat.org/fast/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.GSAFD_GENRE_TERMS,
    prefix: 'gsafd',
    startsWith: '',
    baseUrl: 'https://vocabularyserver.com/gsafd/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_CHILDREN_SUBJECT_HEADINGS,
    prefix: 'sj',
    startsWith: '',
    baseUrl: 'http://id.loc.gov/authorities/childrensSubjects/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_DEMOGRAPHIC_GROUP_TERMS,
    prefix: 'dg',
    startsWith: '',
    baseUrl: 'http://id.loc.gov/authorities/demographicTerms/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_GENRE_FORM_TERMS,
    prefix: 'gf',
    startsWith: '',
    baseUrl: 'http://id.loc.gov/authorities/genreForms/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_MEDIUM_OF_PERFORMANCE_THESAURUS_FOR_MUSIC,
    prefix: 'mp',
    startsWith: '',
    baseUrl: 'http://id.loc.gov/authorities/performanceMediums/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
    prefix: or('n', 'n,nb,nr,no,ns'),
    startsWith: '',
    baseUrl: 'http://id.loc.gov/authorities/names/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
    prefix: 'sh',
    startsWith: '',
    baseUrl: 'http://id.loc.gov/authorities/subjects/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
    prefix: 'D',
    startsWith: '',
    baseUrl: 'https://id.nlm.nih.gov/mesh/',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.RARE_BOOKS_AND_MANUSCRIPTS_SECTION,
    prefix: 'rbmscv',
    startsWith: '',
    baseUrl: '',
  },
  {
    name: DEFAULT_FOLIO_AUTHORITY_FILES.THESAURUS_FOR_GRAPHIC_MATERIALS,
    prefix: or('lcgtm', 'lcgtm,tgm'),
    startsWith: '',
    baseUrl: 'http://id.loc.gov/vocabulary/graphicMaterials/',
  },
];

export default {
  waitLoading,
  clickNewButton,
  clickEditButton,
  clickDeleteButton,
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
  clickSaveButtonAfterCreationFile,
  clickCancelButton,
  checkAfterSaveCreatedFile,
  checkAfterSaveEditedFile,
  checkAfterDeletionFile,
  getEditableListRow,

  fillAllFields: (name, prefix, startsWith, baseUrl, isActive) => {
    fillName(name);
    fillPrefix(prefix);
    fillHridStartsWith(startsWith);
    fillBaseUrl(baseUrl);
    if (isActive) switchActiveCheckbox(isActive);
  },

  checkSourceFileExists(name, prefix, startsWith, baseUrl, isActive, lastUpdatedBy, isDeletable) {
    const targetRow = getTargetRowWithFile(name);

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
      cy.expect(
        manageAuthorityFilesPane
          .find(MultiColumnListRow(including(fileName), { isContainer: true }))
          .exists(),
      );
    } else {
      cy.expect(
        manageAuthorityFilesPane
          .find(MultiColumnListRow(including(fileName), { isContainer: true }))
          .absent(),
      );
    }
  },

  checkErrorInField(authorityFileName, fieldName, errorMessage) {
    const targetRow = getTargetRowWithFile(authorityFileName);

    switch (fieldName) {
      case AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME:
        cy.expect(targetRow.find(nameTextField).has({ error: errorMessage, errorTextRed: true }));
        break;
      case AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX:
        cy.expect(targetRow.find(prefixTextField).has({ error: errorMessage, errorTextRed: true }));
        break;
      case AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH:
        cy.expect(
          targetRow.find(hridStartsWithTextField).has({ error: errorMessage, errorTextRed: true }),
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
  },

  checkManageAuthorityFilesPaneExists(isExist = true) {
    if (isExist) {
      cy.expect([
        manageAuthorityFilesPane.exists(),
        manageAuthorityFilesPane.has({ isFullScreenView: true }),
      ]);
    } else {
      cy.expect(manageAuthorityFilesPane.absent());
    }
  },

  clickSaveButtonAfterEditingFile(authorityFileName) {
    const targetRow = getTargetRowWithFile(authorityFileName);
    cy.wait(1000);
    cy.do(targetRow.find(saveButton).click());
  },

  clickCancelButtonAfterEditingFile(authorityFileName) {
    const targetRow = getTargetRowWithFile(authorityFileName);

    cy.do(targetRow.find(cancelButton).click());
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

  editBaseUrlInFolioFile(authorityFileName, fieldValue) {
    const targetRow = getTargetRowWithFile(authorityFileName);

    cy.do(
      targetRow
        .find(TextField({ placeholder: AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL }))
        .fillIn(fieldValue),
    );
    cy.expect(
      targetRow
        .find(TextField({ placeholder: AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL }))
        .has({ value: fieldValue }),
    );
    cy.expect(targetRow.find(cancelButton).has({ disabled: false }));
    cy.expect(targetRow.find(saveButton).has({ disabled: false }));
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
    const targetRow = getTargetRowWithFile(authorityFileName);

    cy.expect([
      targetRow.find(nameTextField).has({ value: authorityFileName, disabled: false }),
      targetRow.find(prefixTextField).has({ value: prefix, disabled: false }),
      targetRow.find(hridStartsWithTextField).has({ value: hridStartsWith, disabled: false }),
      targetRow.find(baseUrlTextField).has({ value: baseUrl, disabled: false }),
      targetRow.find(activeCheckbox).has({ checked: isActive, disabled: false }),
      targetRow.find(sourceCell).has({ content: source }),
      targetRow.find(MultiColumnListCell(including(createdByUser))).exists(),
      targetRow.find(cancelButton).has({ disabled: isCancelButtonDisabled }),
      targetRow.find(saveButton).has({ disabled: isSaveButtonDisabled }),
    ]);
  },

  checkRowEditableInEditModeInFolioFile(
    authorityFileName,
    prefix,
    hridStartsWith,
    baseUrl,
    isActive,
    isCancelButtonDisabled = false,
    isSaveButtonDisabled = true,
  ) {
    const targetRow = getTargetRowWithFile(authorityFileName);

    cy.expect([
      targetRow.find(MultiColumnListCell(prefix)).exists(),
      targetRow.find(MultiColumnListCell(hridStartsWith)).exists(),
      targetRow.find(baseUrlTextField).has({ value: baseUrl, disabled: false }),
      targetRow.find(activeCheckbox).has({ checked: isActive, disabled: false }),
      targetRow.find(cancelButton).has({ disabled: isCancelButtonDisabled }),
      targetRow.find(saveButton).has({ disabled: isSaveButtonDisabled }),
    ]);
  },

  checkLastUpdatedByUser(authorityFileName, userName) {
    const targetRow = getTargetRowWithFile(authorityFileName);

    cy.expect(targetRow.find(MultiColumnListCell(including(userName))).exists());
  },

  checkAuthorityFilesTableExists(isExist = true) {
    if (isExist) {
      cy.expect(Form(including('Authority files')).exists());
    } else {
      cy.expect(Form(including('Authority files')).absent());
    }
  },

  switchActiveCheckboxInFile(authorityFileName, isChecked) {
    const targetRow = getTargetRowWithFile(authorityFileName);

    cy.do(targetRow.find(activeCheckbox).click());
    cy.expect(targetRow.find(activeCheckbox).has({ checked: isChecked }));
  },

  checkSaveButtonEnabledInFile(authorityFileName, isEnabled = true) {
    const targetRow = getTargetRowWithFile(authorityFileName);

    cy.expect(targetRow.find(saveButton).has({ disabled: !isEnabled }));
  },

  checkCancelButtonEnabledInFile(authorityFileName, isEnabled = true) {
    const targetRow = getTargetRowWithFile(authorityFileName);

    cy.expect(targetRow.find(cancelButton).has({ disabled: !isEnabled }));
  },

  checkDefaultSourceFilesExist() {
    defaultFolioAuthorityFiles.forEach((defaultFolioAuthorityFile) => {
      const targetRow = manageAuthorityFilesPane.find(
        MultiColumnListRow(including(defaultFolioAuthorityFile.name), { isContainer: false }),
      );
      cy.expect([
        targetRow.find(MultiColumnListCell(defaultFolioAuthorityFile.prefix)).exists(),
        targetRow.find(MultiColumnListCell(defaultFolioAuthorityFile.startsWith)).exists(),
        targetRow.find(MultiColumnListCell(defaultFolioAuthorityFile.baseUrl)).exists(),
        targetRow.find(sourceCell).has({ content: AUTHORITY_FILE_SOURCES.FOLIO }),
        targetRow
          .find(MultiColumnListCell({ content: matching(/\d{1,2}\/\d{1,2}\/\d{4} by */) }))
          .exists(),
        targetRow.find(activeCheckbox).has({ disabled: true }),
        targetRow.find(editButton).exists(),
      ]);
    });
  },

  clickConfirmDeletionButton() {
    cy.do(confirmDeletionButton.click());
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

  updateBaseUrlInAuthorityFileViaApi(fileName, newBaseUrl) {
    cy.getAuthoritySourceFileDataViaAPI(fileName).then((body) => {
      cy.updateBaseUrlInAuthoritySourceFileViaAPI(body.id, body._version + 1, newBaseUrl);
    });
  },

  deleteAuthoritySourceFileByNameViaApi(fileName) {
    cy.getAuthoritySourceFileDataViaAPI(fileName).then((body) => {
      if (body.totalRecords !== 0) {
        cy.deleteAuthoritySourceFileViaAPI(body.id, true);
      }
    });
  },

  checkAuthorityFilesTableNotEditable() {
    cy.wait(2000);
    cy.expect([
      Form(including('Authority files')).find(editButton).absent(),
      Form(including('Authority files')).find(deleteButton).absent(),
    ]);
  },

  waitContentLoading() {
    cy.expect(firstRow.exists());
    cy.wait(3000);
  },

  checkActiveTooltipButtonShown() {
    cy.expect(MultiColumnListHeader(tableHeaderTexts[4]).find(tooltipButton).exists());
  },

  checkNewButtonShown(isShown = true) {
    if (isShown) cy.expect(newButton.exists());
    else cy.expect(newButton.absent());
  },

  verifyDeleteModal(sourceFileName) {
    cy.expect([
      deleteModal.exists(),
      deleteModal.find(HTML({ text: including(deleteModalMessage1(sourceFileName)) })).exists(),
      deleteModal.find(HTML({ text: including(deleteModalMessage2) })).exists(),
      deleteModal.find(cancelDeletionButton).exists(),
      deleteModal.find(confirmDeletionButton).exists(),
    ]);
  },
};
