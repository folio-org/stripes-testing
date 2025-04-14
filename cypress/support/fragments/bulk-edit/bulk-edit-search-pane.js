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
} from '../../../../interactors';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../constants';
import FileManager from '../../utils/fileManager';

const bulkEditIcon = Image({ alt: 'View and manage bulk edit' });
const matchedAccordion = Accordion('Preview of record matched');
const changesAccordion = Accordion('Preview of record changed');
const errorsAccordion = Accordion('Errors & warnings');
const recordIdentifierDropdown = Select('Record identifier');
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
    cy.wait(1000);
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
    getScrollableElementInForm('Preview of record matched').scrollTo(direction);
    cy.wait(1000);
  },

  verifyPreviewOfRecordMatchedScrollableHorizontally() {
    getScrollableElementInForm('Preview of record matched').then(($el) => {
      const scrollWidth = $el[0].scrollWidth;
      const clientWidth = $el[0].clientWidth;

      expect(
        scrollWidth,
        'The Preview of record matched is not horizontally scrollable',
      ).to.be.greaterThan(clientWidth);
    });
  },

  verifyPreviewOfRecordMatchedScrollableVertically() {
    getScrollableElementInForm('Preview of record matched').then(($el) => {
      const scrollHeight = $el[0].scrollHeight;
      const clientHeight = $el[0].clientHeight;

      expect(
        scrollHeight,
        'The Preview of record matched is not vertically scrollable',
      ).to.be.greaterThan(clientHeight);
    });
  },

  scrollInChangedAccordion(direction) {
    getScrollableElementInForm('Preview of record changed').scrollTo(direction);
    cy.wait(1000);
  },

  verifyPreviewOfRecordChangedScrollableHorizontally() {
    getScrollableElementInForm('Preview of record changed').then(($el) => {
      const scrollWidth = $el[0].scrollWidth;
      const clientWidth = $el[0].clientWidth;

      expect(
        scrollWidth,
        'The Preview of record changed is not horizontally scrollable',
      ).to.be.greaterThan(clientWidth);
    });
  },

  verifyPreviewOfRecordChangedScrollableVertically() {
    getScrollableElementInForm('Preview of record changed').then(($el) => {
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

  verifySetCriteriaPaneItems(query = true) {
    cy.expect([
      setCriteriaPane.find(identifierToggle).exists(),
      setCriteriaPane.find(logsToggle).exists(),
      setCriteriaPane.find(recordIdentifierDropdown).exists(),
    ]);
    this.recordTypesAccordionExpanded(true);
    this.dragAndDropAreaExists(true);
    this.isDragAndDropAreaDisabled(true);
    if (query) cy.expect(setCriteriaPane.find(queryToggle).exists());
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

  matchedAccordionIsAbsent() {
    cy.expect(matchedAccordion.absent());
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
    cy.then(() => errorsAccordion.find(MultiColumnListCell(identifier)).row()).then((index) => {
      cy.expect([
        errorsAccordion
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ content: identifier, column: 'Record identifier' }))
          .exists(),
        errorsAccordion
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ content: status, column: 'Status' }))
          .exists(),
        errorsAccordion
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ column: 'Reason', content: `${reasonMessage} ` }))
          .exists(),
      ]);
    });
  },

  verifyNonMatchedResults(identifier, reasonMessage = 'No match found ') {
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

  verifyShowWarningsCheckbox(isDisabled, isChecked) {
    cy.expect(
      errorsAccordion
        .find(Checkbox({ labelText: 'Show warnings', disabled: isDisabled, checked: isChecked }))
        .exists(),
    );
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
    ]);
  },

  changeShowColumnCheckbox(...names) {
    names.forEach((name) => {
      cy.do(DropdownMenu().find(Checkbox(name)).click());
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

  verifyResultColumnTitles(title) {
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

  verifyAreYouSureColumnTitlesInclude(title) {
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
    cy.expect(bulkEditPane.find(HTML(`${value} records matched`)).exists());
  },

  verifyPaneRecordsChangedCount(value) {
    cy.expect(bulkEditPane.find(HTML(`${value} records changed`)).exists());
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
    cy.expect(HTML('Drag and drop').has({ visible: exists }));
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

  verifyElectronicAccessElementByIndex(elementIndex, expectedText, miniRowCount = 1) {
    cy.get('[class^="ElectronicAccess"]')
      .find('tr')
      .eq(miniRowCount)
      .find('td')
      .eq(elementIndex)
      .should('have.text', expectedText);
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

  verifyPreviousPaginationButtonDisabled(isDisabled = true) {
    cy.expect(previousPaginationButton.has({ disabled: isDisabled }));
  },

  verifyNextPaginationButtonDisabled(isDisabled = true) {
    cy.expect(nextPaginationButton.has({ disabled: isDisabled }));
  },

  verifyPreviousPaginationButtonInAreYouSureFormDisabled(isDisabled = true) {
    cy.expect(areYouSureForm.find(previousPaginationButton).has({ disabled: isDisabled }));
  },

  verifyNextPaginationButtonInAreYouSureFormDisabled(isDisabled = true) {
    cy.expect(areYouSureForm.find(nextPaginationButton).has({ disabled: isDisabled }));
  },

  verifyPaginatorInMatchedRecords(recordsNumber, isNextButtonDisabled = true) {
    cy.expect([
      matchedAccordion.find(previousPaginationButton).has({ disabled: true }),
      matchedAccordion.find(nextPaginationButton).has({ disabled: isNextButtonDisabled }),
    ]);
    cy.get('div[class^="previewAccordion-"] div[class^="prevNextPaginationContainer-"]')
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

  verifyCellWithContentAbsentsInChangesAccordion(...cellContent) {
    cellContent.forEach((content) => {
      cy.expect(changesAccordion.find(MultiColumnListCell(content)).absent());
    });
  },
};
