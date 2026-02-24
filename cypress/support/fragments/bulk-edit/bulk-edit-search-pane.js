import { HTML } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  RadioButton,
  Select,
  MultiColumnList,
  Pane,
  including,
  TextField,
  Image,
  MultiColumnListRow,
  Headline,
  Spinner,
} from '../../../../interactors';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, BULK_EDIT_FORMS } from '../../constants';
import FileManager from '../../utils/fileManager';

const previewOfRecordsMatchedFormName = 'Preview of records matched';
const previewOfRecordsChangedFormName = 'Preview of records changed';
const bulkEditIcon = Image({ alt: 'View and manage bulk edit' });
const matchedAccordion = Accordion(previewOfRecordsMatchedFormName);
const changesAccordion = Accordion(previewOfRecordsChangedFormName);
const errorsAccordion = Accordion('Errors & warnings');
const showWarningsCheckbox = Checkbox({ labelText: 'Show warnings' });
const recordIdentifierDropdown = Select(including('Record identifier'));
const recordTypesAccordion = Accordion({ label: 'Record types' });
const actions = Button('Actions');
const fileButton = Button('or choose file');
const bulkEditQueryPane = Pane(including('Bulk edit query'));
const bulkEditPane = Pane(including('Bulk edit'));
const usersRadio = RadioButton('Users');
const itemsRadio = RadioButton('Inventory - items');
const holdingsRadio = RadioButton('Inventory - holdings');
const instancesRadio = RadioButton('Inventory - instances');
const identifierToggle = Button('Identifier');
const queryToggle = Button('Query');
const logsToggle = Button('Logs');
const setCriteriaPane = Pane('Set criteria');
const saveAndClose = Button('Save & close');
const buildQueryButton = Button('Build query');
const searchColumnNameTextfield = TextField({ placeholder: 'Search column name' });
const areYouSureForm = Modal('Are you sure?');
const previousPaginationButton = Button('Previous');
const nextPaginationButton = Button('Next');
const getScrollableElementInForm = (formName) => {
  return cy
    .get('[class^=previewAccordion-]')
    .contains(formName)
    .closest('[class^=previewAccordion-]')
    .find('div[class^="mclScrollable"]');
};
const electronicAccessTableHeaders = [
  'URL relationship',
  'URI',
  'Link text',
  'Material specified',
  'URL public note',
];
const formMap = {
  [BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED]: matchedAccordion,
  [BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED]: changesAccordion,
  [BULK_EDIT_FORMS.ARE_YOU_SURE]: areYouSureForm,
};
export const subjectsTableHeaders = ['Subject headings', 'Subject source', 'Subject type'];
export const classificationsTableHeaders = ['Classification identifier type', 'Classification'];
export const publicationTableHeaders = [
  'Publisher',
  'Publisher role',
  'Place of publication',
  'Publication date',
];
const embeddedTableHeadersMap = {
  electronicAccess: electronicAccessTableHeaders,
  subjects: subjectsTableHeaders,
  classifications: classificationsTableHeaders,
  publications: publicationTableHeaders,
};
export const instanceNotesColumnNames = [
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADDITIONAL_PHYSICAL_FORM_AVAILABLE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.AWARDS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIBLIOGRAPHY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BINDING_INFORMATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CARTOGRAPHIC_MATHEMATICAL_DATA,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CASE_FILE_CHARACTERISTICS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CITATION_REFERENCES_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CREATION_PRODUCTION_CREDITS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CUMULATIVE_INDEX_FINDING_AIDS_NOTES,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATE_TIME_PLACE_EVENT_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ENTITY_ATTRIBUTE_INFORMATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EXHIBITIONS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMER_TITLE_COMPLEXITY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GEOGRAPHIC_COVERAGE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.IMMEDIATE_SOURCE_ACQUISITION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_ABOUT_DOCUMENTATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ISSUING_BODY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LINKING_ENTRY_COMPLEXITY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCAL_NOTES,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCATION_ORIGINALS_DUPLICATES_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCATION_OTHER_ARCHIVAL_MATERIALS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.METHODOLOGY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NUMBERING_PECULIARITIES_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ORIGINAL_VERSION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PARTICIPANT_PERFORMER_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREFERRED_CITATION_DESCRIBED_MATERIALS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESTRICTIONS_ACCESS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SCALE_NOTE_GRAPHIC_MATERIAL,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE_DESCRIPTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPLEMENT_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SYSTEM_DETAILS_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TARGET_AUDIENCE_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TERMS_GOVERNING_USE_REPRODUCTION_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TYPE_COMPUTER_FILE_DATA_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TYPE_REPORT_PERIOD_COVERED_NOTE,
  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
];
export const userIdentifiers = ['User UUIDs', 'User Barcodes', 'External IDs', 'Usernames'];
export const holdingsIdentifiers = [
  'Holdings UUIDs',
  'Holdings HRIDs',
  'Instance HRIDs',
  'Item barcodes',
];
export const itemIdentifiers = [
  'Item barcodes',
  'Item UUIDs',
  'Item HRIDs',
  'Item former identifiers',
  'Item accession numbers',
  'Holdings UUIDs',
];
export const instanceIdentifiers = ['Instance UUIDs', 'Instance HRIDs'];
export const ITEM_IDENTIFIERS = {
  ITEM_BARCODES: 'Item barcodes',
};
export const ERROR_MESSAGES = {
  EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED:
    'Bulk edit of instance notes is not supported for MARC Instances.',
  NO_CHANGE_REQUIRED: 'No change in value required',
  NO_CHANGE_IN_ADMINISTRATIVE_DATA_REQUIRED: 'No change in administrative data required',
  NO_CHANGE_IN_MARC_FIELDS_REQUIRED: 'No change in MARC fields required',
  NO_MATCH_FOUND: 'No match found',
  INCORRECT_TOKEN_NUMBER:
    'Incorrect number of tokens found in record: expected 1 actual 3 (IncorrectTokenCountException)',
  FOLIO_SOURCE_NOT_SUPPORTED_BY_MARC_BULK_EDIT:
    'Instance with source FOLIO is not supported by MARC records bulk edit and cannot be updated.',
  OPTIMISTIC_LOCKING:
    'The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. View latest version',
  DUPLICATE_ENTRY: 'Duplicate entry',
  SHADOW_RECORDS_CANNOT_BE_BULK_EDITED: 'Shadow records cannot be bulk edited.',
  MULTIPLE_MATCHES_FOR_IDENTIFIER: 'Multiple matches for the same identifier.',
  INVALID_MARC_RECORD:
    'Underlying MARC record contains invalid data and the record cannot be updated.',
  MISSING_SRS_RECORD: 'SRS record associated with the instance is missing.',
  MULTIPLE_SRS_RECORDS_ASSOCIATED:
    'Multiple SRS records are associated with the instance. The following SRS have been identified:',
  ADMINISTRATIVE_NOTES_NOT_SUPPORTED_FOR_MARC:
    'Change note type for administrative notes is not supported for MARC Instances.',
  getInvalidStatusValueMessage: (statusValue) => `New status value "${statusValue}" is not allowed`,
};
export const getReasonForTenantNotAssociatedError = (entityIdentifier, tenantId, propertyName) => {
  return `${entityIdentifier} cannot be updated because the record is associated with ${tenantId} and ${propertyName} is not associated with this tenant.`;
};

export default {
  waitLoading() {
    cy.expect(bulkEditPane.exists());
    cy.wait(1000);
  },

  scrollInAreYouSureForm(direction) {
    cy.get('[class^=modal-] div[class^="mclScrollable"]').scrollTo(direction);
    cy.wait(1500);
  },

  verifyAreYouSureFormScrollableHorizontally() {
    cy.get('[class^=modal-] div[class^="mclScrollable"]').then(($el) => {
      const scrollWidth = $el[0].scrollWidth;
      const clientWidth = $el[0].clientWidth;

      expect(scrollWidth, 'The Are you sure form is not horizontally scrollable').to.be.greaterThan(
        clientWidth,
      );
    });
  },

  verifyAreYouSureFormScrollableVertically() {
    cy.get('[class^=modal-] div[class^="mclScrollable"]').then(($el) => {
      const scrollHeight = $el[0].scrollHeight;
      const clientHeight = $el[0].clientHeight;

      expect(scrollHeight, 'The Are you sure form is not vertically scrollable').to.be.greaterThan(
        clientHeight,
      );
    });
  },

  scrollInMatchedAccordion(direction) {
    getScrollableElementInForm(previewOfRecordsMatchedFormName).scrollTo(direction);
    cy.wait(1000);
  },

  verifyPreviewOfRecordMatchedScrollableHorizontally() {
    getScrollableElementInForm(previewOfRecordsMatchedFormName).then(($el) => {
      const scrollWidth = $el[0].scrollWidth;
      const clientWidth = $el[0].clientWidth;

      expect(
        scrollWidth,
        'The Preview of record matched is not horizontally scrollable',
      ).to.be.greaterThan(clientWidth);
    });
  },

  verifyPreviewOfRecordMatchedScrollableVertically() {
    getScrollableElementInForm(previewOfRecordsMatchedFormName).then(($el) => {
      const scrollHeight = $el[0].scrollHeight;
      const clientHeight = $el[0].clientHeight;

      expect(
        scrollHeight,
        'The Preview of record matched is not vertically scrollable',
      ).to.be.greaterThan(clientHeight);
    });
  },

  scrollInChangedAccordion(direction) {
    getScrollableElementInForm(previewOfRecordsChangedFormName).scrollTo(direction);
    cy.wait(1000);
  },

  verifyPreviewOfRecordChangedScrollableHorizontally() {
    getScrollableElementInForm(previewOfRecordsChangedFormName).then(($el) => {
      const scrollWidth = $el[0].scrollWidth;
      const clientWidth = $el[0].clientWidth;

      expect(
        scrollWidth,
        'The Preview of record changed is not horizontally scrollable',
      ).to.be.greaterThan(clientWidth);
    });
  },

  verifyPreviewOfRecordChangedScrollableVertically() {
    getScrollableElementInForm(previewOfRecordsChangedFormName).then(($el) => {
      const scrollHeight = $el[0].scrollHeight;
      const clientHeight = $el[0].clientHeight;

      expect(
        scrollHeight,
        'The Preview of record changed is not vertically scrollable',
      ).to.be.greaterThan(clientHeight);
    });
  },

  checkForUploading(fileName) {
    cy.expect(HTML(including(`Uploading ${fileName} and retrieving relevant data`)).exists());
    cy.expect(HTML(including('Retrieving...')));
  },

  progresBarIsAbsent() {
    cy.expect(HTML(including('Uploading ... and retrieving relevant data')).absent());
    cy.expect(HTML(including('Retrieving...')).absent());
  },

  verifyNoPermissionWarning() {
    cy.expect(HTML("You don't have permission to view this app/record").exists());
  },

  actionsIsAbsent() {
    cy.expect(actions.absent());
  },

  verifyPopulatedPreviewPage() {
    cy.expect([errorsAccordion.exists(), matchedAccordion.exists(), actions.exists()]);
  },

  actionsIsShown() {
    cy.expect(actions.exists());
  },

  verifyPanesBeforeImport() {
    cy.expect([setCriteriaPane.exists(), bulkEditPane.exists()]);
  },

  verifyBulkEditImage() {
    cy.expect([bulkEditIcon.exists()]);
  },

  verifyBulkEditPaneItems() {
    cy.expect(bulkEditPane.find(HTML('Set criteria to start bulk edit')).exists());
  },

  verifyBulkEditPaneAfterRecordTypeSelected() {
    this.verifyBulkEditPaneItems();
    this.actionsIsAbsent();
    cy.expect(bulkEditPane.find(HTML('Select a record identifier.')).exists());
  },

  verifySetCriteriaPaneItems(query = true, logs = true) {
    cy.expect([
      setCriteriaPane.find(identifierToggle).exists(),
      setCriteriaPane.find(recordIdentifierDropdown).exists(),
    ]);
    this.recordTypesAccordionExpanded(true);
    this.dragAndDropAreaExists(true);
    this.isDragAndDropAreaDisabled(true);
    if (query) cy.expect(setCriteriaPane.find(queryToggle).exists());
    if (logs) cy.expect(setCriteriaPane.find(logsToggle).exists());
  },

  verifySetCriteriaPaneElements() {
    cy.expect([
      setCriteriaPane.find(identifierToggle).exists(),
      recordTypesAccordion.find(usersRadio).exists(),
      this.isUsersRadioChecked(false),
      recordTypesAccordion.find(itemsRadio).exists(),
      this.isItemsRadioChecked(false),
      recordTypesAccordion.find(holdingsRadio).exists(),
      this.isHoldingsRadioChecked(false),
      setCriteriaPane.find(recordIdentifierDropdown).exists(),
    ]);
    this.verifyRecordIdentifierDisabled(true);
    this.recordTypesAccordionExpanded(true);
    this.dragAndDropAreaExists(true);
    this.isDragAndDropAreaDisabled(true);
    cy.expect(HTML('Select a record type and then a record identifier.').exists());
  },

  verifySetCriteriaPaneSpecificTabs(...tabs) {
    tabs.forEach((tab) => {
      cy.expect(setCriteriaPane.find(Button(`${tab}`)).exists());
    });
  },

  verifySetCriteriaPaneSpecificTabsHidden(...tabs) {
    tabs.forEach((tab) => {
      cy.expect(setCriteriaPane.find(Button(`${tab}`)).absent());
    });
  },

  verifySpecificTabHighlighted(tab) {
    cy.expect(Button(`${tab}`).has({ default: false }));
  },

  verifyRecordTypesAccordion() {
    cy.expect([
      recordTypesAccordion.find(HTML('Users')).exists(),
      recordTypesAccordion.find(HTML('Inventory - items')).exists(),
      recordTypesAccordion.find(HTML('Inventory - holdings')).exists(),
      recordTypesAccordion.find(HTML('Inventory - instances')).exists(),
    ]);
  },

  verifyRecordIdentifierEmpty() {
    cy.expect(recordIdentifierDropdown.find(HTML('')).exists());
  },

  verifyRecordTypesEmpty() {
    cy.expect(recordTypesAccordion.find(HTML('')).exists());
  },

  verifyRecordIdentifiers(identifiers) {
    identifiers.forEach((identifier) => {
      cy.expect(recordIdentifierDropdown.find(HTML(identifier)).exists());
    });
  },

  verifyRecordTypeIdentifiers(recordType) {
    switch (recordType) {
      case 'Users':
        this.checkUsersRadio();
        this.isUsersRadioChecked(true);
        this.verifyRecordIdentifiers(userIdentifiers);
        break;
      case 'Holdings':
        this.checkHoldingsRadio();
        this.isHoldingsRadioChecked(true);
        this.verifyRecordIdentifiers(holdingsIdentifiers);
        break;
      case 'Items':
        this.checkItemsRadio();
        this.isItemsRadioChecked(true);
        this.verifyRecordIdentifiers(itemIdentifiers);
        break;
      case 'Instances':
        this.checkInstanceRadio();
        this.isInstancesRadioChecked(true);
        this.verifyRecordIdentifiers(instanceIdentifiers);
        break;
      default:
    }
    this.isDragAndDropAreaDisabled(true);
  },

  verifyAfterChoosingIdentifier(identifier) {
    // If identifier is an abbreviation or starts with U E, leave it as it is
    // If it's not, change the first letter to lowercase
    let lowercase = identifier;
    if (!['U', 'E'].includes(identifier.charAt(0)) && identifier.charAt(1).match(/[a-z]/)) {
      lowercase = identifier.charAt(0).toLowerCase() + identifier.slice(1);
    }
    cy.expect([
      HTML(`Select a file with ${lowercase}.`).exists(),
      HTML(`Drag and drop or choose file with ${lowercase}.`).exists(),
    ]);
    this.isDragAndDropAreaDisabled(false);
  },

  verifyDragNDropRecordTypeIdentifierArea(recordType, identifier) {
    this.openIdentifierSearch();
    const lowercaseRecordType = recordType === 'Users' ? recordType : recordType.toLowerCase();
    cy.do(RadioButton(including(lowercaseRecordType)).click());
    this.selectRecordIdentifier(identifier);
    this.verifyAfterChoosingIdentifier(identifier);
    cy.wait(1000);
  },

  openIdentifierSearch() {
    cy.do(identifierToggle.click());
  },

  openQuerySearch() {
    cy.do(queryToggle.click());
  },

  openLogsSearch() {
    cy.do(logsToggle.click());
    cy.wait(2000);
  },

  recordTypesAccordionExpanded(expanded = true) {
    cy.expect(recordTypesAccordion.has({ open: expanded }));
  },

  verifyQueryPane(selectedRadio = 'Users') {
    cy.expect([
      queryToggle.has({ default: false }),
      recordTypesAccordion.find(usersRadio).exists(),
      recordTypesAccordion.find(itemsRadio).exists(),
      recordTypesAccordion.find(holdingsRadio).exists(),
      setCriteriaPane.find(buildQueryButton).has({ disabled: false }),
    ]);
    this.recordTypesAccordionExpanded(true);
    // eslint-disable-next-line no-unused-expressions
    selectedRadio === 'Items'
      ? this.isItemsRadioChecked()
      : selectedRadio === 'Holdings'
        ? this.isHoldingsRadioChecked()
        : this.isUsersRadioChecked();
    this.verifyBulkEditPaneItems();
  },

  verifySetCriteriaPaneExists() {
    cy.expect(setCriteriaPane.exists());
  },

  verifyCsvViewPermission() {
    this.verifyUsersRadioAbsent();
    cy.expect([
      itemsRadio.absent(),
      holdingsRadio.absent(),
      fileButton.has({ disabled: true }),
      actions.absent(),
    ]);
    this.verifyRecordIdentifierDisabled(true);
  },

  verifyUsersUpdatePermission() {
    cy.expect([
      itemsRadio.absent(),
      holdingsRadio.absent(),
      fileButton.has({ disabled: true }),
      actions.absent(),
    ]);
  },

  verifyInAppViewPermission() {
    this.verifyUsersRadioAbsent();
    cy.expect([
      itemsRadio.absent(),
      holdingsRadio.absent(),
      fileButton.has({ disabled: true }),
      actions.absent(),
    ]);
    this.verifyRecordIdentifierDisabled(true);
  },

  verifyRecordIdentifierDisabled(disabled = true) {
    cy.expect(recordIdentifierDropdown.has({ disabled }));
  },

  selectRecordIdentifier(value) {
    cy.do(recordIdentifierDropdown.choose(value));
    cy.wait(1000);
  },

  clickToBulkEditMainButton() {
    cy.do(Button({ id: 'ModuleMainHeading' }).click());
  },

  verifyDefaultFilterState() {
    cy.expect([
      fileButton.has({ disabled: true }),
      HTML('Select a record type and then a record identifier.').exists(),
    ]);
    this.verifyBulkEditPaneItems();
  },

  verifyInputLabel(name) {
    cy.expect(HTML(name).exists());
  },

  verifyUsersRadioAbsent() {
    cy.expect(usersRadio.absent());
  },

  checkUsersRadio() {
    cy.do(usersRadio.click());
  },

  usersRadioIsDisabled(isDisabled) {
    cy.expect(usersRadio.has({ disabled: isDisabled }));
  },

  isUsersRadioChecked(checked = true) {
    cy.expect(usersRadio.has({ checked }));
  },

  checkItemsRadio() {
    cy.do(itemsRadio.click());
    cy.wait(500);
  },

  itemsRadioIsDisabled(isDisabled) {
    cy.expect(itemsRadio.has({ disabled: isDisabled }));
  },

  isItemsRadioChecked(checked = true) {
    cy.expect(itemsRadio.has({ checked }));
  },

  checkHoldingsRadio() {
    cy.do(holdingsRadio.click());
    cy.wait(500);
  },

  holdingsRadioIsDisabled(isDisabled) {
    cy.expect(holdingsRadio.has({ disabled: isDisabled }));
  },

  isHoldingsRadioChecked(checked = true) {
    cy.expect(holdingsRadio.has({ checked }));
  },

  checkInstanceRadio() {
    cy.do(instancesRadio.click());
  },

  instancesRadioIsDisabled(isDisabled) {
    cy.expect(instancesRadio.has({ disabled: isDisabled }));
  },

  isInstancesRadioChecked(checked = true) {
    cy.expect(instancesRadio.has({ checked }));
  },

  verifyRadioHidden(name) {
    cy.expect(RadioButton(name).absent());
  },

  uploadFile(fileName) {
    cy.do(fileButton.has({ disabled: false }));
    cy.get('input[type=file]').attachFile(fileName, { allowEmpty: true });
  },

  uploadRecentlyDownloadedFile(downloadedFile) {
    const changedFileName = `downloaded-${downloadedFile}`;

    FileManager.findDownloadedFilesByMask(downloadedFile).then((downloadedFilenames) => {
      const firstDownloadedFilename = downloadedFilenames[0];
      FileManager.readFile(firstDownloadedFilename).then((actualContent) => {
        FileManager.createFile(`cypress/fixtures/${changedFileName}`, actualContent);
      });
    });
    this.uploadFile(changedFileName);

    return cy.wrap(changedFileName);
  },

  waitFileUploading() {
    // it is needed to avoid triggering for previous page list
    cy.wait(3000);
    cy.expect(MultiColumnList().exists());
    cy.wait(1000);
  },

  verifyCsvUploadModal(filename) {
    cy.expect(Modal(including(filename)).exists());
    cy.expect([
      HTML(including('records will be updated if the Commit changes button is clicked.')).exists(),
      Button('Cancel').exists(),
      Button('Commit changes').exists(),
    ]);
  },

  verifyModalName(name) {
    cy.expect(Modal(name).exists());
    cy.do(Button('Cancel').click());
  },

  verifyMatchedResults(...values) {
    values.forEach((value) => {
      cy.expect(matchedAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
    cy.expect(matchedAccordion.has({ itemsAmount: values.length.toString() }));
  },

  verifySpecificItemsMatched(...values) {
    values.forEach((value) => {
      cy.expect(matchedAccordion.find(MultiColumnListCell({ content: including(value) })).exists());
    });
  },

  errorsAccordionIsAbsent() {
    cy.expect(errorsAccordion.absent());
  },

  matchedAccordionIsAbsent(isAbsent = true) {
    if (isAbsent) {
      cy.expect(matchedAccordion.absent());
    } else {
      cy.expect(matchedAccordion.exists());
    }
  },

  verifyUserBarcodesResultAccordion() {
    cy.expect([
      MultiColumnListHeader('Username').exists(),
      MultiColumnListHeader('Barcode').exists(),
      MultiColumnListHeader('Active').exists(),
      MultiColumnListHeader('Patron group').exists(),
      MultiColumnListHeader('Last name').exists(),
      MultiColumnListHeader('First name').exists(),
    ]);
  },

  verifyChangedResults(...values) {
    values.forEach((value) => {
      cy.expect(changesAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
    cy.expect(
      bulkEditPane.find(HTML(`${values.length} records have been successfully changed`)).exists(),
    );
  },

  verifyNoChangesPreview() {
    cy.expect([
      changesAccordion.absent(),
      bulkEditPane.find(HTML('0 records have been successfully changed')).exists(),
    ]);
  },

  verifyLocationChanges(rows, locationValue) {
    for (let i = 0; i < rows; i++) {
      cy.expect(
        changesAccordion.find(MultiColumnListCell({ row: i, content: locationValue })).exists(),
      );
    }
  },

  verifyChangesUnderColumns(columnName, value) {
    cy.expect(MultiColumnListCell({ column: columnName, content: including(value) }).exists());
  },

  verifyExactChangesUnderColumns(columnName, value) {
    cy.expect(MultiColumnListCell({ column: columnName, content: value }).exists());
  },

  verifyExactChangesUnderColumnsByRow(columnName, value, row = 0) {
    cy.expect(
      areYouSureForm
        .find(MultiColumnListRow({ indexRow: `row-${row}` }))
        .find(MultiColumnListCell({ column: columnName, content: value }))
        .exists(),
    );
  },

  verifyExactChangesUnderColumnsByRowInPreviewRecordsChanged(columnName, value, row = 0) {
    cy.expect(
      changesAccordion
        .find(MultiColumnListRow({ indexRow: `row-${row}` }))
        .find(MultiColumnListCell({ column: columnName, content: value }))
        .exists(),
    );
  },

  verifyExactChangesUnderColumnsByRowInPreview(columnName, value, row = 0) {
    cy.expect(
      MultiColumnListRow({ indexRow: `row-${row}` })
        .find(MultiColumnListCell({ column: columnName, content: value }))
        .exists(),
    );
  },

  verifyExactChangesUnderColumnsByIdentifier(identifier, columnName, value) {
    cy.then(() => areYouSureForm.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.expect(
        areYouSureForm
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ column: columnName, content: value }))
          .exists(),
      );
    });
  },

  verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(identifier, columnValues) {
    cy.then(() => areYouSureForm.find(MultiColumnListCell(identifier)).row()).then((index) => {
      columnValues.forEach((pair) => {
        cy.expect(
          areYouSureForm
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ column: pair.header, content: pair.value }))
            .exists(),
        );
      });
    });
  },

  verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(identifier, columnName, value) {
    cy.then(() => matchedAccordion.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.expect(
        matchedAccordion
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ column: columnName, content: value }))
          .exists(),
      );
    });
  },

  verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(identifier, columnValues) {
    cy.then(() => matchedAccordion.find(MultiColumnListCell(identifier)).row()).then((index) => {
      columnValues.forEach((pair) => {
        cy.expect(
          matchedAccordion
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ column: pair.header, content: pair.value }))
            .exists(),
        );
      });
    });
  },

  verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(identifier, columnName, value) {
    cy.then(() => changesAccordion.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.expect(
        changesAccordion
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ column: columnName, content: value }))
          .exists(),
      );
    });
  },

  verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(identifier, columnValues) {
    cy.then(() => changesAccordion.find(MultiColumnListCell(identifier)).row()).then((index) => {
      columnValues.forEach((pair) => {
        cy.expect(
          changesAccordion
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ column: pair.header, content: pair.value }))
            .exists(),
        );
      });
    });
  },

  verifyError(identifier, reasonMessage, status = 'Error') {
    cy.expect([
      errorsAccordion
        .find(MultiColumnListCell({ content: identifier, column: 'Record identifier' }))
        .exists(),
      errorsAccordion.find(MultiColumnListCell({ content: status, column: 'Status' })).exists(),
      errorsAccordion
        .find(MultiColumnListCell({ column: 'Reason', content: `${reasonMessage} ` }))
        .exists(),
    ]);
  },

  verifyErrorByIdentifier(identifier, reasonMessage, status = 'Error') {
    cy.then(() => {
      return errorsAccordion
        .find(
          MultiColumnListRow({
            content: including(`${identifier}${reasonMessage}`),
            isContainer: false,
          }),
        )
        .indexRow();
    }).then((indexRow) => {
      cy.expect([
        errorsAccordion
          .find(MultiColumnListRow({ indexRow }))
          .find(MultiColumnListCell({ content: identifier, column: 'Record identifier' }))
          .exists(),
        errorsAccordion
          .find(MultiColumnListRow({ indexRow }))
          .find(MultiColumnListCell({ content: status, column: 'Status' }))
          .exists(),
        errorsAccordion
          .find(MultiColumnListRow({ indexRow }))
          .find(MultiColumnListCell({ column: 'Reason', content: `${reasonMessage} ` }))
          .exists(),
      ]);
    });
  },

  verifyNonMatchedResults(identifier, reasonMessage = `${ERROR_MESSAGES.NO_MATCH_FOUND} `) {
    cy.expect([
      errorsAccordion.find(MultiColumnListCell({ column: 'Status', content: 'Error' })).exists(),
      errorsAccordion
        .find(MultiColumnListCell({ column: 'Record identifier', content: identifier }))
        .exists(),
      errorsAccordion
        .find(MultiColumnListCell({ column: 'Reason', content: reasonMessage }))
        .exists(),
    ]);
  },

  verifyErrorLabel(errorsCount, warningsCount = 0) {
    const errorLabel = `${errorsCount} error${errorsCount !== 1 ? 's' : ''}`;
    const warningLabel = `${warningsCount} warning${warningsCount !== 1 ? 's' : ''}`;

    cy.expect(
      errorsAccordion.find(Headline(including(`${errorLabel} * ${warningLabel}`))).exists(),
    );
  },

  verifyErrorsAccordionIncludesNumberOfIdentifiers(expectedErrorsCount, arrayOfIdentifiers) {
    cy.then(() => {
      errorsAccordion
        .find(MultiColumnList())
        .rowCount()
        .then((count) => {
          expect(count).to.equal(expectedErrorsCount);
        });
    });
    cy.then(() => {
      for (let i = 0; i < expectedErrorsCount; i++) {
        errorsAccordion
          .find(MultiColumnList())
          .find(MultiColumnListRow({ indexRow: `row-${i}` }))
          .find(MultiColumnListCell({ column: 'Record identifier' }))
          .content()
          .then((identifier) => {
            expect(arrayOfIdentifiers).to.include(identifier);
          });
      }
    });
  },

  verifyVisibleErrors(allowedIdentifiers, errorTemplate, expectedCount = 10) {
    for (let i = 0; i < expectedCount; i++) {
      errorsAccordion
        .find(MultiColumnListRow({ indexRow: `row-${i}` }))
        .find(MultiColumnListCell({ column: 'Record identifier' }))
        .content()
        .then((identifier) => {
          expect(allowedIdentifiers).to.include(identifier);
          this.verifyErrorByIdentifier(identifier, errorTemplate(identifier));
        });
    }
  },

  verifyShowWarningsCheckbox(isDisabled, isChecked) {
    cy.expect(
      errorsAccordion
        .find(Checkbox({ labelText: 'Show warnings', disabled: isDisabled, checked: isChecked }))
        .exists(),
    );
  },

  clickShowWarningsCheckbox() {
    cy.do(errorsAccordion.find(showWarningsCheckbox).click());
  },

  verifyReasonForError(errorText) {
    cy.expect(errorsAccordion.find(HTML(including(errorText))).exists());
  },

  verifyActionsAfterConductedCSVUploading(errors = true) {
    cy.do(actions.click());
    cy.expect([
      Button('Download matched records (CSV)').exists(),
      DropdownMenu().find(HTML('Show columns')).exists(),
    ]);
    if (errors) {
      cy.expect(Button('Download errors (CSV)').exists());
    }
  },

  verifyActionsAfterConductedInAppUploading(errors = true, instance = false) {
    cy.do(actions.click());
    cy.expect([
      Button('Download matched records (CSV)').exists(),
      DropdownMenu().find(HTML('Show columns')).exists(),
      DropdownMenu().find(searchColumnNameTextfield).exists(),
    ]);
    if (errors) {
      cy.expect(Button('Download errors (CSV)').exists());
    }
    if (instance) {
      cy.expect([
        DropdownMenu().find(Headline('Start bulk edit')).exists(),
        Button('FOLIO Instances').exists(),
      ]);
    } else {
      cy.expect(Button('Start bulk edit').exists());
    }
  },

  verifySearchColumnNameTextFieldExists() {
    cy.expect(DropdownMenu().find(searchColumnNameTextfield).exists());
  },

  verifySearchColumnNameTextFieldAbsent() {
    cy.expect(DropdownMenu().find(searchColumnNameTextfield).absent());
  },

  verifyUsersActionShowColumns() {
    cy.expect([
      DropdownMenu().find(Checkbox('Username')).has({ checked: true }),
      DropdownMenu().find(Checkbox('User id')).has({ checked: false }),
      DropdownMenu().find(Checkbox('External System ID')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Barcode')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Active')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Type')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Patron group')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Departments')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Proxy for')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Last name')).has({ checked: true }),
      DropdownMenu().find(Checkbox('First name')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Middle name')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Preferred first name')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Email')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Phone')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Mobile phone')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Birth date')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Addresses')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Preferred contact type id')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Link to the profile picture')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Date enrolled')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Expiration date')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Tags')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Custom fields')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Preferred email communications')).has({ checked: false }),
    ]);
  },

  verifyAllCheckboxesInShowColumnMenuAreDisabled() {
    cy.expect(
      DropdownMenu()
        .find(Checkbox({ disabled: false }))
        .absent(),
    );
  },

  verifyCheckboxesAbsent(...checkboxes) {
    checkboxes.forEach((checkbox) => {
      cy.expect(Checkbox(checkbox).absent());
    });
  },

  verifyCheckedCheckboxesPresentInTheTable() {
    cy.wait(2000);
    cy.get('[role=columnheader]').then((headers) => {
      headers.each((_index, header) => {
        cy.expect(DropdownMenu().find(Checkbox(header.innerText)).has({ checked: true }));
      });
    });
  },

  verifyColumnsInTableInExactOrder(expectedHeadersOrder) {
    cy.get('[role=columnheader]').then(($headers) => {
      const actualHeadersOrder = $headers
        .map((index, header) => Cypress.$(header).text().trim())
        .get();

      expect(actualHeadersOrder).to.deep.eq(expectedHeadersOrder);
    });
  },

  verifyColumnsInAreYouSureFormInExactOrder(expectedHeadersOrder) {
    cy.get('[aria-label=PreviewModal]')
      .find('[role=columnheader]')
      .then(($headers) => {
        const actualHeadersOrder = $headers
          .map((index, header) => Cypress.$(header).text().trim())
          .get();

        expect(actualHeadersOrder).to.deep.eq(expectedHeadersOrder);
      });
  },

  verifyActionsDropdownScrollable() {
    cy.xpath('.//main[@id="ModuleContainer"]//div[contains(@class, "DropdownMenu")]').scrollTo(
      'bottom',
    );
  },

  verifyHoldingActionShowColumns() {
    cy.expect([
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TYPE))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.FORMER_HOLDINGS_ID))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.INSTANCE))
        .has({ checked: false }),
      DropdownMenu()
        .find(
          Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION),
        )
        .has({ checked: true }),
      DropdownMenu()
        .find(
          Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION),
        )
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS))
        .has({ checked: false }),
      DropdownMenu()
        .find(
          Checkbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_LEVEL_CALL_NUMBER_TYPE,
          ),
        )
        .has({ checked: false }),
      DropdownMenu()
        .find(
          Checkbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_LEVEL_CALL_NUMBER_PREFIX,
          ),
        )
        .has({ checked: false }),
      DropdownMenu()
        .find(
          Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_LEVEL_CALL_NUMBER),
        )
        .has({ checked: false }),
      DropdownMenu()
        .find(
          Checkbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_LEVEL_CALL_NUMBER_SUFFIX,
          ),
        )
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SHELVING_TITLE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACQUISITION_METHOD))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.RECEIPT_STATUS))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NOTE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ILL_POLICY))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.RETENTION_POLICY))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.PROVENANCE_NOTE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.REPRODUCTION))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ORDER_FORMAT))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.DIGITIZATION_POLICY))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_STATEMENT))
        .has({ checked: false }),
      DropdownMenu()
        .find(
          Checkbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_STATEMENT_FOR_INDEXES,
          ),
        )
        .has({ checked: false }),
      DropdownMenu()
        .find(
          Checkbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_STATEMENT_FOR_SUPPLEMENTS,
          ),
        )
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_COPY_NUMBER))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.NUMBER_OF_ITEMS))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.STATISTICAL_CODES))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.TAGS))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SOURCE))
        .has({ checked: true }),
    ]);
  },

  verifyItemActionShowColumns() {
    const checkedByDefault = [
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_EFFECTIVE_LOCATION,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.EFFECTIVE_CALL_NUMBER,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
    ];
    const uncheckedByDefault = [
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.INSTANCE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.HOLDINGS,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACCESSION_NUMBER,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_IDENTIFIER,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.FORMER_IDENTIFIER,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATISTICAL_CODES,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NUMBER,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SHELVING_ORDER,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_LEVEL_CALL_NUMBER_TYPE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_LEVEL_CALL_NUMBER_PREFIX,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_LEVEL_CALL_NUMBER,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_LEVEL_CALL_NUMBER_SUFFIX,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.NUMBER_OF_PIECES,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.DESCRIPTION_OF_PIECES,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ENUMERATION,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHRONOLOGY,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.VOLUME,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.YEAR_CAPTION,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.NUMBER_OF_MISSING_PIECES,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MISSING_PIECES,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MISSING_PIECES_DATE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_DAMAGED_STATUS,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_DAMAGED_STATUS_DATE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PROVENANCE_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.REPRODUCTION_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TAGS,
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.HOLDINGS_UUID,
    ];

    checkedByDefault.forEach((header) => {
      cy.expect(DropdownMenu().find(Checkbox(header)).has({ checked: true }));
    });
    uncheckedByDefault.forEach((header) => {
      cy.expect(DropdownMenu().find(Checkbox(header)).has({ checked: false }));
    });
  },

  verifyInstanceActionShowColumns() {
    cy.expect([
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.MODE_OF_ISSUANCE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INDEX_TITLE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE))
        .has({ checked: true }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NATURE_OF_CONTENT))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_RANGE))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT))
        .has({ checked: false }),
      DropdownMenu()
        .find(Checkbox(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION))
        .has({ checked: false }),
    ]);
  },

  changeShowColumnCheckbox(...names) {
    names.forEach((name) => {
      cy.do(DropdownMenu().find(Checkbox(name)).click());
      cy.wait(500);
    });
    cy.wait(500);
  },

  changeShowColumnCheckboxIfNotYet(...names) {
    names.forEach((name) => {
      cy.get(`[name='${name}']`).then((element) => {
        const checked = element.attr('checked');
        if (!checked) {
          cy.do(DropdownMenu().find(Checkbox(name)).click());
        }
      });
    });
    cy.wait(500);
  },

  verifyCheckboxInActionsDropdownMenuChecked(name, isChecked = true) {
    cy.expect(DropdownMenu().find(Checkbox(name)).has({ checked: isChecked }));
  },

  verifyCheckboxesInActionsDropdownMenuChecked(isChecked, ...names) {
    names.forEach((name) => {
      this.verifyCheckboxInActionsDropdownMenuChecked(name, isChecked);
    });
  },

  uncheckShowColumnCheckbox(...names) {
    names.forEach((name) => {
      cy.get(`[name='${name}']`).then((element) => {
        const checked = element.attr('checked');
        if (checked) {
          cy.do(DropdownMenu().find(Checkbox(name)).click());
        }
      });
      this.verifyResultColumnTitlesDoNotInclude(name);
    });
  },

  verifyResultsUnderColumns(columnName, value) {
    cy.expect(
      matchedAccordion.find(MultiColumnListCell({ column: columnName, content: value })).exists(),
    );
  },

  getMultiColumnListCellsValues(cell) {
    return cy.get('[data-row-index]').then((rows) => {
      return rows
        .get()
        .map((row) => row.querySelector(`[class*="mclCell-"]:nth-child(${cell})`).innerText);
    });
  },

  verifyRecordTypesSortedAlphabetically() {
    const locator = '[class*="labelText"]';
    cy.get(locator).then((checkboxes) => {
      const textArray = checkboxes.get().map((el) => el.innerText);
      const sortedArray = [...textArray].sort((a, b) => a - b);
      expect(sortedArray).to.eql(textArray);
    });
  },

  verifyResultColumnTitles(title, isNeedToScroll = false) {
    if (isNeedToScroll) this.scrollInMatchedAccordion('right');
    cy.expect(matchedAccordion.find(MultiColumnListHeader(title)).exists());
  },

  verifyResultColumnTitlesDoNotInclude(title) {
    cy.expect(matchedAccordion.find(MultiColumnListHeader(title)).absent());
  },

  verifyResultColumnTitlesDoNotIncludeTitles(...titles) {
    titles.forEach((title) => {
      this.verifyResultColumnTitlesDoNotInclude(title);
    });
  },

  verifyAreYouSureColumnTitlesInclude(title, isNeedToScroll = false) {
    if (isNeedToScroll) this.scrollInAreYouSureForm('right');
    cy.expect(areYouSureForm.find(MultiColumnListHeader(title)).exists());
  },

  verifyAreYouSureColumnTitlesDoNotInclude(title, isNeedToScroll = false) {
    if (isNeedToScroll) this.scrollInAreYouSureForm('right');
    cy.expect(areYouSureForm.find(MultiColumnListHeader(title)).absent());
  },

  verifyChangedColumnTitlesInclude(title) {
    cy.expect(changesAccordion.find(MultiColumnListHeader(title)).exists());
  },

  verifyChangedColumnTitlesDoNotInclude(title, isNeedToScroll = false) {
    if (isNeedToScroll) this.scrollInChangedAccordion('right');
    cy.expect(changesAccordion.find(MultiColumnListHeader(title)).absent());
  },

  verifyPaneRecordsCount(value) {
    const recordCount = parseInt(value, 10);
    if (recordCount === 0) {
      cy.expect(matchedAccordion.absent());
    } else {
      cy.expect([
        matchedAccordion.has({ numberOfRows: recordCount }),
        bulkEditPane.find(HTML(`${value} records matched`)).exists(),
      ]);
    }
  },

  verifyPaneRecordsChangedCount(value) {
    const recordCount = parseInt(value, 10);
    if (recordCount === 0) {
      cy.expect(changesAccordion.absent());
    } else {
      cy.expect([
        changesAccordion.has({ numberOfRows: recordCount }),
        bulkEditPane.find(HTML(`${value} records changed`)).exists(),
      ]);
    }
  },

  verifyFileNameHeadLine(fileName) {
    cy.expect(bulkEditPane.find(HTML(`Filename: ${fileName}`)).exists());
  },

  verifyPaneTitleFileName(fileName) {
    cy.expect(Pane(`Bulk edit ${fileName}`).exists());
  },

  clickRecordTypesAccordion() {
    cy.do(recordTypesAccordion.clickHeader());
  },

  verifyRecordTypesAccordionCollapsed() {
    this.recordTypesAccordionExpanded(false);
    this.verifyUsersRadioAbsent();
    cy.expect([itemsRadio.absent(), holdingsRadio.absent()]);
  },

  waitingFileDownload() {
    cy.wait(3000);
  },

  dragAndDropAreaExists(exists) {
    cy.expect([
      HTML('Drag and drop').has({ visible: exists }),
      setCriteriaPane.find(HTML('Select a file with record identifiers.')).exists(),
    ]);
  },

  isDragAndDropAreaDisabled(isDisabled) {
    cy.expect(fileButton.has({ disabled: isDisabled }));
  },

  isSaveAndCloseButtonDisabled(isDisabled) {
    cy.expect(saveAndClose.has({ disabled: isDisabled }));
  },

  isBuildQueryButtonDisabled(isDisabled = true) {
    cy.expect(buildQueryButton.has({ disabled: isDisabled }));
    cy.wait(2000);
  },

  clickBuildQueryButton() {
    cy.wait(2000);
    cy.expect(buildQueryButton.has({ disabled: false }));
    cy.do(buildQueryButton.click());
  },

  verifyFirstOptionRecordIdentifierDropdown(value) {
    cy.expect(recordIdentifierDropdown.has({ checkedOptionText: value }));
  },

  searchColumnName(text, valid = true) {
    cy.get('[placeholder="Search column name"]').type(text);
    cy.wait(500);
    cy.get('[class^="ActionMenu-"]').within(() => {
      if (valid) {
        cy.get('[class^="checkbox-"]')
          .should('exist')
          .then(() => {
            cy.get('[class^="checkbox-"]').each(($checkbox) => {
              cy.wrap($checkbox).should(($el) => {
                expect($el.text().toLowerCase()).to.contain(text.toLowerCase());
              });
            });
          });
      } else {
        cy.get('[class^="checkbox-"]').should('not.exist');
      }
    });
  },

  clearSearchColumnNameTextfield() {
    cy.do(searchColumnNameTextfield.clear());
  },

  verifySearchColumnNameTextFieldInFocus() {
    cy.get('[placeholder="Search column name"]').click();
    cy.expect(searchColumnNameTextfield.has({ focused: true }));
  },

  searchColumnNameTextfieldAbsent() {
    cy.expect([searchColumnNameTextfield.absent(), DropdownMenu().find(Checkbox()).absent()]);
  },

  checkboxWithTextAbsent(text) {
    cy.get('[class^="ActionMenu-"]').within(() => {
      cy.get('[class^="checkbox-"]').each(($checkbox) => {
        cy.wrap($checkbox).should(($el) => {
          expect($el.text().toLowerCase()).to.not.contain(text.toLowerCase());
        });
      });
    });
  },

  verifyCheckboxesAbsentInActionsDropdownMenu() {
    cy.expect(DropdownMenu().find(Checkbox()).absent());
  },

  verifyElectronicAccessElementByIndex(elementIndex, expectedText, miniRowCount = 1) {
    cy.get('[class^="DynamicTable-"]')
      .find('tr')
      .eq(miniRowCount)
      .find('td')
      .eq(elementIndex)
      .should('have.text', expectedText);
  },

  verifyEmbeddedTableColumnHeadersInForm(tableType, formType, instanceIdentifier) {
    const headers = embeddedTableHeadersMap[tableType];
    if (!headers) {
      throw new Error(
        `Unknown table type: ${tableType}. Available types: ${Object.keys(embeddedTableHeadersMap).join(', ')}`,
      );
    }

    cy.then(() => formMap[formType].find(MultiColumnListCell(instanceIdentifier)).row()).then(
      (rowIndex) => {
        cy.get(`[data-row-index="row-${rowIndex}"]`)
          .eq(0)
          .within(() => {
            cy.get('[class^="DynamicTable-"]')
              .find('tr')
              .eq(0)
              .then((headerRow) => {
                const headerCells = headerRow.find('th');

                headers.forEach((header, index) => {
                  expect(headerCells.eq(index).text()).to.equal(header);
                });
              });
          });
      },
    );
  },

  verifyEmbeddedTableInForm(tableType, formType, identifier, expectedValues) {
    this.verifyEmbeddedTableColumnHeadersInForm(tableType, formType, identifier);

    cy.then(() => formMap[formType].find(MultiColumnListCell(identifier)).row()).then(
      (rowIndex) => {
        cy.get(`[data-row-index="row-${rowIndex}"]`)
          .eq(0)
          .within(() => {
            cy.get('[class^="DynamicTable-"]')
              .find('tbody tr')
              .should(($rows) => {
                // Check if any row contains all our expected values
                const matchingRow = Array.from($rows).find((row) => {
                  const rowText = Cypress.$(row).text().trim();
                  const expectedRowText = expectedValues.join('').trim();
                  return rowText === expectedRowText;
                });

                if (!matchingRow) {
                  throw new Error(
                    `Could not find a row in table "${tableType}" containing all values: [${expectedValues.join(', ')}] for entity with identifier "${identifier}"`,
                  );
                }
              });
          });
      },
    );
  },

  verifyElectronicAccessColumnHeadersInForm(formType, instanceIdentifier) {
    this.verifyEmbeddedTableColumnHeadersInForm('electronicAccess', formType, instanceIdentifier);
  },

  verifyElectronicAccessTableInForm(
    formType,
    identifier,
    relationship,
    uri,
    linkText,
    materialsSpecified,
    publicNote,
  ) {
    const expectedValues = [relationship, uri, linkText, materialsSpecified, publicNote];
    this.verifyEmbeddedTableInForm('electronicAccess', formType, identifier, expectedValues);
  },

  verifySubjectColumnHeadersInForm(formType, instanceIdentifier) {
    this.verifyEmbeddedTableColumnHeadersInForm('subjects', formType, instanceIdentifier);
  },

  verifySubjectTableInForm(
    formType,
    instanceIdentifier,
    subjectHeadingValue,
    subjectValue,
    subjectTypeValue,
  ) {
    const expectedValues = [subjectHeadingValue, subjectValue, subjectTypeValue];
    this.verifyEmbeddedTableInForm('subjects', formType, instanceIdentifier, expectedValues);
  },

  verifyClassificationColumnHeadersInForm(formType, instanceIdentifier) {
    this.verifyEmbeddedTableColumnHeadersInForm('classifications', formType, instanceIdentifier);
  },

  verifyClassificationTableInForm(
    formType,
    instanceIdentifier,
    classificationIdentifierTypeValue,
    classificationValue,
  ) {
    const expectedValues = [classificationIdentifierTypeValue, classificationValue];
    this.verifyEmbeddedTableInForm('classifications', formType, instanceIdentifier, expectedValues);
  },

  verifyPublicationColumnHeadersInForm(formType, instanceIdentifier) {
    this.verifyEmbeddedTableColumnHeadersInForm('publications', formType, instanceIdentifier);
  },

  verifyPublicationTableInForm(
    formType,
    instanceIdentifier,
    publisher,
    publisherRole,
    placeOfPublication,
    publicationDate,
  ) {
    const expectedValues = [publisher, publisherRole, placeOfPublication, publicationDate];
    this.verifyEmbeddedTableInForm('publications', formType, instanceIdentifier, expectedValues);
  },

  verifyRowHasEmptyElectronicAccessInMatchAccordion(identifier) {
    cy.then(() => matchedAccordion.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.get(`[data-row-index="row-${index}"]`).find('table').should('not.exist');
    });
  },

  verifyRowHasEmptyElectronicAccessInAreYouSureForm(identifier) {
    cy.then(() => areYouSureForm.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.get(`[data-row-index="row-${index}"]`).find('table').should('not.exist');
    });
  },

  verifyRowHasEmptyElectronicAccessInChangedAccordion(identifier) {
    cy.then(() => changesAccordion.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.get(`[data-row-index="row-${index}"]`).find('table').should('not.exist');
    });
  },

  getNumberMatchedRecordsFromPaneHeader() {
    return cy
      .get('[class^=paneSub]')
      .should('contain.text', 'records match')
      .invoke('text')
      .then((textContent) => {
        const numberOfRecords = parseInt(textContent, 10);

        return numberOfRecords;
      });
  },

  verifyPaginatorInMatchedRecords(recordsNumber, isNextButtonDisabled = true) {
    cy.expect([
      matchedAccordion.find(previousPaginationButton).has({ disabled: true }),
      matchedAccordion.find(nextPaginationButton).has({ disabled: isNextButtonDisabled }),
    ]);
    cy.get('div[class^="previewAccordion-"] div[class^="prevNextPaginationContainer-"]')
      .eq(0)
      .find('div')
      .invoke('text')
      .should('eq', `1 - ${recordsNumber}`);
  },

  verifyPaginatorInAreYouSureForm(recordsNumber, isNextButtonDisabled = true) {
    cy.expect([
      areYouSureForm.find(previousPaginationButton).has({ disabled: true }),
      areYouSureForm.find(nextPaginationButton).has({ disabled: isNextButtonDisabled }),
    ]);
    cy.get('div[aria-label^="PreviewModal"] div[class^="prevNextPaginationContainer-"]')
      .find('div')
      .invoke('text')
      .should('eq', `1 - ${recordsNumber}`);
  },

  verifyPaginatorInErrorsAccordion(recordsNumber, isNextButtonDisabled = true) {
    cy.expect([
      errorsAccordion.find(previousPaginationButton).has({ disabled: true }),
      errorsAccordion.find(nextPaginationButton).has({ disabled: isNextButtonDisabled }),
    ]);
    cy.get('div[class^="errorAccordion"] div[class^="prevNextPaginationContainer-"]')
      .find('div')
      .invoke('text')
      .should('eq', `1 - ${recordsNumber}`);
  },

  verifyPaginatorInChangedRecords(recordsNumber, isNextButtonDisabled = true) {
    cy.expect([
      changesAccordion.find(previousPaginationButton).has({ disabled: true }),
      changesAccordion.find(nextPaginationButton).has({ disabled: isNextButtonDisabled }),
    ]);
    cy.get('div[class^="previewAccordion-"] div[class^="prevNextPaginationContainer-"]')
      .first()
      .find('div')
      .invoke('text')
      .should('eq', `1 - ${recordsNumber}`);
  },

  verifyInstanceNoteColumns(instanceNoteColumnNames) {
    cy.get('[class*="DropdownMenu"] [class*="labelText"]').then((columns) => {
      const columnNames = Cypress.$(columns)
        .map((index, column) => {
          return Cypress.$(column).text();
        })
        .get();
      // get an array of instance note column name
      const noteColumnNames = columnNames.slice(
        columnNames.findIndex((item) => item === 'Publication range') + 1,
        columnNames.findIndex((item) => item === 'With note') + 1,
      );
      const noteColumnNamesInAlphabeticOrder = [...noteColumnNames].sort();

      // verify alphabetical order
      expect(noteColumnNames).to.deep.equal(noteColumnNamesInAlphabeticOrder);
      // verify exact columns exist
      instanceNoteColumnNames.forEach((instanceNoteColumnName) => {
        expect(noteColumnNames).include(instanceNoteColumnName);
        // verify that the checkbox for this column is unchecked
        cy.expect(DropdownMenu().find(Checkbox(instanceNoteColumnName)).has({ checked: false }));
      });
    });
  },

  verifyRecordsCountInBulkEditQueryPane(value) {
    cy.expect(bulkEditQueryPane.find(HTML(`${value} records matched`)).exists());
  },

  verifyBulkEditQueryPaneExists() {
    cy.expect(bulkEditQueryPane.exists());
  },

  verifyQueryHeadLine(query) {
    cy.expect(bulkEditQueryPane.find(HTML(`Query: ${query}`)).exists());
  },

  waitForInterceptedRespose(allias, targetProperty, targetValue, maxRetries = 20) {
    let retries = 0;

    function checkResponse() {
      cy.wait(allias, { timeout: 20000 }).then((interception) => {
        if (interception.response.body[targetProperty] !== targetValue) {
          retries++;
          if (retries > maxRetries) {
            throw new Error(
              `Exceeded maximum retry attempts waiting for ${targetProperty} to have ${targetValue}`,
            );
          }
          cy.wait(1000);
          checkResponse();
        }
        expect(interception.response.body[targetProperty]).to.eq(targetValue);
      });
    }
    checkResponse();
  },

  verifyCellWithContentAbsentsInMatchedAccordion(...cellContent) {
    cellContent.forEach((content) => {
      cy.expect(matchedAccordion.find(MultiColumnListCell(content)).absent());
    });
  },

  verifyCellWithContentAbsentsInChangesAccordion(...cellContent) {
    cellContent.forEach((content) => {
      cy.expect(changesAccordion.find(MultiColumnListCell(content)).absent());
    });
  },

  verifyCellWithContentAbsentsInAreYouSureForm(...cellContent) {
    cellContent.forEach((content) => {
      cy.expect(areYouSureForm.find(MultiColumnListCell(content)).absent());
    });
  },

  clickViewLatestVersionInErrorsAccordionByIdentifier(identifier) {
    cy.then(() => errorsAccordion.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.do(
        errorsAccordion
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ column: 'Reason' }))
          .perform((el) => {
            el.querySelector('a[target="_blank"]').removeAttribute('target');
            el.querySelector('a').click();
          }),
      );
    });
  },

  verifySpinnerAbsent() {
    cy.expect(bulkEditPane.find(Spinner()).absent());
  },
};
