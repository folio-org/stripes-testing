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
  MultiColumnListRow,
  TextField,
  TextInput,
  Image,
  SelectionList,
  SelectionOption,
} from '../../../../interactors';
import { ListRow } from '../../../../interactors/multi-column-list';

const bulkEditIcon = Image({ alt: 'View and manage bulk edit' });
const logsStartDateAccordion = Accordion('Started');
const logsEndDateAccordion = Accordion('Ended');
const applyBtn = Button('Apply');
const logsResultPane = Pane({ id: 'bulk-edit-logs-pane' });
const resultsAccordion = Accordion('Preview of record matched');
const changesAccordion = Accordion('Preview of record changed');
const errorsAccordion = Accordion('Errors');
const recordIdentifierDropdown = Select('Record identifier');
const recordTypesAccordion = Accordion({ label: 'Record types' });
const actions = Button('Actions');
const fileButton = Button('or choose file');
const bulkEditPane = Pane(including('Bulk edit'));
const usersRadio = RadioButton('Users');
const itemsRadio = RadioButton('Inventory - items');
const holdingsRadio = RadioButton('Inventory - holdings');
const instancesRadio = RadioButton('Inventory - instances');
const usersCheckbox = Checkbox('Users');
const holdingsCheckbox = Checkbox('Inventory - holdings');
const itemsCheckbox = Checkbox('Inventory - items');
const instancesCheckbox = Checkbox('Inventory - instances');
const identifierToggle = Button('Identifier');
const queryToggle = Button('Query');
const logsToggle = Button('Logs');
const setCriteriaPane = Pane('Set criteria');
const searchButton = Button('Search');
const resetAllButton = Button('Reset all');
const logsStatusesAccordion = Accordion('Statuses');
const logsUsersAccordion = Accordion('User');
const clearAccordionButton = Button({ icon: 'times-circle-solid' });
const usersSelectionList = SelectionList({ placeholder: 'Filter options list' });
const saveAndClose = Button('Save and close');
const textFieldTo = TextField('To');
const textFieldFrom = TextField('From');
const confirmChanges = Button('Confirm changes');
const triggerBtn = DropdownMenu().find(Button('File that was used to trigger the bulk edit'));
const errorsEncounteredBtn = DropdownMenu().find(
  Button('File with errors encountered during the record matching'),
);
const matchingRecordsBtn = DropdownMenu().find(Button('File with the matching records'));
const previewPorposedChangesBtn = DropdownMenu().find(
  Button('File with the preview of proposed changes'),
);
const updatedRecordBtn = DropdownMenu().find(Button('File with updated records'));
const errorsCommittingBtn = DropdownMenu().find(
  Button('File with errors encountered when committing the changes'),
);
const buildQueryButton = Button('Build query');
const logsActionButton = Button({ icon: 'ellipsis' });

const newCheckbox = Checkbox('New');
const retrievingRecordsCheckbox = Checkbox('Retrieving records');
const savingRecordsCheckbox = Checkbox('Saving records');
const dataModificationCheckbox = Checkbox('Data modification');
const reviewingChangesCheckbox = Checkbox('Reviewing changes');
const completedCheckbox = Checkbox('Completed');
const completedWithErrorsCheckbox = Checkbox('Completed with errors');
const failedCheckbox = Checkbox('Failed');
const searchColumnNameTextfield = TextField({ placeholder: 'Search column name' });

export const userIdentifiers = ['User UUIDs', 'User Barcodes', 'External IDs', 'Usernames'];

export const holdingsIdentifiers = [
  'Holdings UUIDs',
  'Holdings HRIDs',
  'Instance HRIDs',
  'Item barcodes',
];

export const itemIdentifiers = [
  'Item barcode',
  'Item UUIDs',
  'Item HRIDs',
  'Item former identifier',
  'Item accession number',
  'Holdings UUIDs',
];

export const instanceIdentifiers = ['Instance UUIDs', 'Instance HRIDs'];

export default {
  waitLoading() {
    cy.expect(bulkEditPane.exists());
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

  searchBtnIsDisabled(isDisabled) {
    cy.expect(searchButton.has({ disabled: isDisabled }));
  },

  resetAllBtnIsDisabled(isDisabled) {
    cy.expect(resetAllButton.has({ disabled: isDisabled }));
  },

  resetAll() {
    cy.do(resetAllButton.click());
  },

  actionsIsAbsent() {
    cy.expect(actions.absent());
  },

  verifyPopulatedPreviewPage() {
    cy.expect([errorsAccordion.exists(), resultsAccordion.exists(), actions.exists()]);
  },

  logActionsIsAbsent() {
    cy.expect(logsActionButton.absent());
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
      HTML(`Select a file with ${lowercase}`).exists(),
      HTML(`Drag and drop or choose file with ${lowercase}.`).exists(),
    ]);
    this.isDragAndDropAreaDisabled(false);
  },

  verifyDragNDropRecordTypeIdentifierArea(recordType, identifier) {
    this.openIdentifierSearch();
    const lowercaseRecordType = recordType === 'Users' ? recordType : recordType.toLowerCase();
    cy.do(RadioButton(including(lowercaseRecordType)).click());
    this.selectRecordIdentifier(identifier);
    const modifiedIdentifier = identifier === 'Item barcodes' ? 'item barcode' : identifier;
    this.verifyAfterChoosingIdentifier(modifiedIdentifier);
  },

  verifyCheckboxIsSelected(checkbox, isChecked = false) {
    cy.expect(Checkbox({ name: checkbox }).has({ checked: isChecked }));
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

  verifyLogsPane() {
    this.verifyLogsStatusesAccordionExistsAndUnchecked();
    cy.expect([
      logsToggle.has({ default: false }),
      resetAllButton.has({ disabled: true }),
      recordTypesAccordion.find(usersCheckbox).has({ checked: false }),
      recordTypesAccordion.find(itemsCheckbox).has({ checked: false }),
      recordTypesAccordion.find(holdingsCheckbox).has({ checked: false }),
      recordTypesAccordion.find(instancesCheckbox).has({ checked: false }),
      logsStartDateAccordion.has({ open: false }),
      logsEndDateAccordion.has({ open: false }),
      bulkEditPane.find(HTML('Bulk edit logs')).exists(),
      bulkEditPane.find(HTML('Enter search criteria to start search')).exists(),
      bulkEditPane.find(HTML('Choose a filter to show results.')).exists(),
    ]);
  },

  verifyLogsPaneHeader() {
    cy.expect([
      bulkEditPane.find(HTML('Bulk edit logs')).exists(),
      bulkEditPane.find(HTML(including('records found'))).exists(),
    ]);
  },

  checkLogsCheckbox(status) {
    cy.do(Checkbox(status).click());
  },

  resetStatuses() {
    cy.do(
      Accordion('Statuses')
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
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
  },

  itemsRadioIsDisabled(isDisabled) {
    cy.expect(itemsRadio.has({ disabled: isDisabled }));
  },

  isItemsRadioChecked(checked = true) {
    cy.expect(itemsRadio.has({ checked }));
  },

  checkHoldingsRadio() {
    cy.do(holdingsRadio.click());
  },

  checkHoldingsCheckbox() {
    cy.do(holdingsCheckbox.click());
  },

  checkItemsCheckbox() {
    cy.do(itemsCheckbox.click());
  },

  checkUsersCheckbox() {
    cy.do(usersCheckbox.click());
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
      cy.expect(resultsAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
    cy.expect(resultsAccordion.has({ itemsAmount: values.length.toString() }));
  },

  verifySpecificItemsMatched(...values) {
    values.forEach((value) => {
      cy.expect(resultsAccordion.find(MultiColumnListCell({ content: including(value) })).exists());
    });
  },

  errorsAccordionIsAbsent() {
    cy.expect(errorsAccordion.absent());
  },

  matchedAccordionIsAbsent() {
    cy.expect(resultsAccordion.absent());
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

  verifyNonMatchedResults(...values) {
    cy.expect([
      errorsAccordion.find(MultiColumnListHeader('Record identifier')).exists(),
      errorsAccordion.find(MultiColumnListHeader('Reason for error')).exists(),
    ]);
    values.forEach((value) => {
      cy.expect(errorsAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
  },

  verifyErrorLabel(fileName, validRecordCount, invalidRecordCount) {
    cy.expect(
      HTML(
        `${fileName}: ${
          validRecordCount + invalidRecordCount
        } entries * ${validRecordCount} records matched * ${invalidRecordCount} errors`,
      ).exists(),
    );
  },

  verifyErrorLabelAfterChanges(fileName, validRecordCount, invalidRecordCount) {
    cy.expect(
      Accordion('Errors')
        .find(
          HTML(
            `${fileName}: ${
              validRecordCount + invalidRecordCount
            } entries * ${validRecordCount} records changed * ${invalidRecordCount} errors`,
          ),
        )
        .exists(),
    );
  },

  verifyReasonForError(errorText) {
    cy.expect(
      Accordion('Errors')
        .find(HTML(including(errorText)))
        .exists(),
    );
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

  verifyActionsAfterConductedInAppUploading(errors = true) {
    cy.do(actions.click());
    cy.expect([
      Button('Download matched records (CSV)').exists(),
      Button('Start bulk edit').exists(),
      DropdownMenu().find(HTML('Show columns')).exists(),
      DropdownMenu().find(searchColumnNameTextfield).exists(),
    ]);
    if (errors) {
      cy.expect(Button('Download errors (CSV)').exists());
    }
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
      DropdownMenu().find(Checkbox('Date enrolled')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Expiration date')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Tags')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Custom fields')).has({ checked: false }),
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

  verifyActionsDropdownScrollable() {
    cy.xpath('.//main[@id="ModuleContainer"]//div[contains(@class, "DropdownMenu")]').scrollTo(
      'bottom',
    );
  },

  verifyHoldingActionShowColumns() {
    cy.expect([
      DropdownMenu().find(Checkbox('Holdings ID')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Version')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings HRID')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Holdings type')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Former ids')).has({ checked: false }),
      DropdownMenu()
        .find(Checkbox('Instance (Title, Publisher, Publication date)'))
        .has({ checked: false }),
      DropdownMenu().find(Checkbox('Permanent location')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Temporary location')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Effective location')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Electronic access')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Call number type')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Call number prefix')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Call number')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Call number suffix')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Shelving title')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Acquisition format')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Acquisition method')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Receipt status')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Note')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Administrative note')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Ill policy')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Retention policy')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Digitization policy')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings statements')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings statements for indexes')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings statements for supplements')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Copy number')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Number of items')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Receiving history')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Suppress from discovery')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Statistical codes')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Tags')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Source')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Instance HRID')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Item barcode')).has({ checked: false }),
    ]);
  },

  changeShowColumnCheckbox(...names) {
    names.forEach((name) => {
      cy.do(DropdownMenu().find(Checkbox(name)).click());
    });
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

  uncheckShowColumnCheckbox(...names) {
    names.forEach((name) => {
      cy.get(`[name='${name}']`).then((element) => {
        const checked = element.attr('checked');
        if (checked) {
          cy.do(DropdownMenu().find(Checkbox(name)).click());
        }
      });
    });
  },

  verifyResultsUnderColumns(columnName, value) {
    cy.expect(
      resultsAccordion.find(MultiColumnListCell({ column: columnName, content: value })).exists(),
    );
  },

  getMultiColumnListCellsValues(cell) {
    return cy.get('[data-row-index]').then((rows) => {
      return rows
        .get()
        .map((row) => row.querySelector(`[class*="mclCell-"]:nth-child(${cell})`).innerText);
    });
  },

  // In Identifier pane - radio, in Logs pane - checkbox
  verifyRecordTypesSortedAlphabetically(checkbox = true) {
    let locator;
    if (checkbox) locator = '#entityType [class*="labelText"]';
    else locator = '[class*="labelText"]';
    cy.get(locator).then((checkboxes) => {
      const textArray = checkboxes.get().map((el) => el.innerText);
      const sortedArray = [...textArray].sort((a, b) => a - b);
      expect(sortedArray).to.eql(textArray);
    });
  },

  verifyCellsValues(column, status) {
    this.getMultiColumnListCellsValues(column)
      .should('have.length.at.least', 1)
      .each((value) => {
        expect(value).to.eq(status);
      });
  },

  verifyDateCellsValues(column, fromDate, toDate) {
    this.getMultiColumnListCellsValues(column)
      .should('have.length.at.least', 1)
      .each((value) => {
        if (!value.includes('No value set')) {
          const cellDate = new Date(value);
          const to = new Date(toDate);
          to.setDate(to.getDate() + 1);
          expect(cellDate).to.greaterThan(new Date(fromDate));
          expect(cellDate).to.lessThan(to);
        }
      });
  },

  verifyResultColumTitles(title) {
    cy.expect(resultsAccordion.find(MultiColumnListHeader(title)).exists());
  },

  verifyResultColumTitlesDoNotInclude(title) {
    cy.expect(resultsAccordion.find(MultiColumnListHeader(title)).absent());
  },

  verifyPaneRecordsCount(value) {
    cy.expect(bulkEditPane.find(HTML(`${value} records match`)).exists());
  },

  verifyPaneTitleFileName(fileName) {
    cy.expect(Pane(`Bulk edit ${fileName}`).exists());
  },

  clickRecordTypesAccordion() {
    cy.do(recordTypesAccordion.clickHeader());
  },

  clickLogsStatusesAccordion() {
    cy.do(logsStatusesAccordion.clickHeader());
  },

  clickLogsStartedAccordion() {
    cy.do(logsStartDateAccordion.clickHeader());
  },

  clickLogsEndedAccordion() {
    cy.do(logsEndDateAccordion.clickHeader());
  },

  verifyRecordTypesAccordionCollapsed() {
    this.recordTypesAccordionExpanded(false);
    this.verifyUsersRadioAbsent();
    cy.expect([itemsRadio.absent(), holdingsRadio.absent()]);
  },

  verifyUserAccordionCollapsed() {
    cy.expect(Accordion('User').has({ open: false }));
  },

  verifyLogsStatusesAccordionCollapsed() {
    cy.expect([
      logsStatusesAccordion.has({ open: false }),
      newCheckbox.absent(),
      retrievingRecordsCheckbox.absent(),
      savingRecordsCheckbox.absent(),
      dataModificationCheckbox.absent(),
      reviewingChangesCheckbox.absent(),
      completedCheckbox.absent(),
      completedWithErrorsCheckbox.absent(),
      failedCheckbox.absent(),
    ]);
  },

  verifyLogsRecordTypesAccordionCollapsed() {
    this.recordTypesAccordionExpanded(false);
    cy.expect([usersCheckbox.absent(), holdingsCheckbox.absent(), itemsCheckbox.absent()]);
  },

  verifyLogsStatusesAccordionExistsAndUnchecked() {
    cy.expect([
      logsStatusesAccordion.has({ open: true }),
      newCheckbox.has({ checked: false }),
      retrievingRecordsCheckbox.has({ checked: false }),
      savingRecordsCheckbox.has({ checked: false }),
      dataModificationCheckbox.has({ checked: false }),
      reviewingChangesCheckbox.has({ checked: false }),
      completedCheckbox.has({ checked: false }),
      completedWithErrorsCheckbox.has({ checked: false }),
      failedCheckbox.has({ checked: false }),
    ]);
  },

  verifyLogsRecordTypesAccordionExistsAndUnchecked() {
    this.recordTypesAccordionExpanded(true);
    cy.expect([
      usersCheckbox.has({ checked: false }),
      holdingsCheckbox.has({ checked: false }),
      itemsCheckbox.has({ checked: false }),
    ]);
  },

  verifyLogsStartedAccordionExistsWithElements() {
    cy.expect([
      logsStartDateAccordion.has({ open: true }),
      logsStartDateAccordion
        .find(textFieldFrom)
        .find(Button({ icon: 'calendar' }))
        .exists(),
      logsStartDateAccordion
        .find(textFieldTo)
        .find(Button({ icon: 'calendar' }))
        .exists(),
      logsStartDateAccordion.find(textFieldFrom).has({ placeholder: 'YYYY-MM-DD' }),
      logsStartDateAccordion.find(textFieldTo).has({ placeholder: 'YYYY-MM-DD' }),
      logsStartDateAccordion.find(applyBtn).exists(),
    ]);
  },

  verifyDateFieldWithError(accordion, textField, errorMessage) {
    cy.expect([
      Accordion(accordion).find(TextField(textField)).has({ errorIcon: true }),
      Accordion(accordion).find(TextField(textField)).has({ errorBorder: true }),
      Accordion(accordion).find(TextField(textField)).has({ error: errorMessage }),
    ]);
  },

  verifyDateAccordionValidationMessage(accordion, message) {
    cy.expect(Accordion(accordion).has({ validationMessage: message }));
  },

  verifyLogsEndedAccordionExistsWithElements() {
    cy.expect([
      logsEndDateAccordion.has({ open: true }),
      logsEndDateAccordion
        .find(textFieldFrom)
        .find(Button({ icon: 'calendar' }))
        .exists(),
      logsEndDateAccordion
        .find(textFieldTo)
        .find(Button({ icon: 'calendar' }))
        .exists(),
      logsEndDateAccordion.find(textFieldFrom).has({ placeholder: 'YYYY-MM-DD' }),
      logsEndDateAccordion.find(textFieldTo).has({ placeholder: 'YYYY-MM-DD' }),
      logsEndDateAccordion.find(applyBtn).exists(),
    ]);
  },

  verifyLogsDateFiledIsEqual(accordion, fieldName, valueToVerify) {
    cy.expect(Accordion(accordion).find(TextField(fieldName)).has({ value: valueToVerify }));
  },

  verifyClearSelectedFiltersButton(accordion, verification = 'exists') {
    cy.expect(
      Accordion(accordion)
        .find(Button({ icon: 'times-circle-solid' }))
        // eslint-disable-next-line no-unexpected-multiline
        [verification](),
    );
  },

  clickUserAccordion() {
    cy.do(logsUsersAccordion.clickHeader());
  },

  selectUserFromDropdown(name) {
    cy.do([usersSelectionList.select(including(name))]);
  },

  fillUserFilterInput(userName) {
    cy.do([usersSelectionList.find(TextInput()).fillIn(userName)]);
  },

  verifyDropdown(userName) {
    cy.get('[id*="option-stripes-selection-"]').should('exist');
    cy.then(() => usersSelectionList.optionList()).then((options) => {
      cy.wrap(options).then(
        (opts) => expect(opts.some((opt) => opt.includes(userName))).to.be.true,
      );
    });
  },

  verifyUserIsNotInUserList(name) {
    cy.do([usersSelectionList.find(SelectionOption(including(name))).absent()]);
  },

  verifyEmptyUserDropdown() {
    cy.expect([
      usersSelectionList.find(HTML('-List is empty-')).exists(),
      usersSelectionList.find(HTML('No matching options')).exists(),
    ]);
  },

  clickChooseUserUnderUserAccordion() {
    cy.do(logsUsersAccordion.find(Button(including('Select control'))).click());
  },

  verifyClearSelectedButtonExists(accordion, presence = true) {
    cy.wait(1000);
    if (presence) {
      cy.expect(Accordion(accordion).find(clearAccordionButton).exists());
    } else {
      cy.expect(Accordion(accordion).find(clearAccordionButton).absent());
    }
  },

  clickClearSelectedButton(accordion) {
    cy.do(Accordion(accordion).find(clearAccordionButton).click());
  },

  verifyClearSelectedDateButtonExists(accordion, textField) {
    cy.expect(
      Accordion(accordion)
        .find(TextField({ label: textField }))
        .find(Button({ icon: 'times-circle-solid' }))
        .exists(),
    );
  },

  clickClearSelectedFiltersButton(accordion) {
    cy.do(
      Accordion(accordion)
        .find(
          Button({ icon: 'times-circle-solid', ariaLabel: including('Clear selected filters') }),
        )
        .click(),
    );
  },

  clickClearSelectedDateButton(accordion, textField) {
    cy.do(
      Accordion(accordion)
        .find(TextField({ label: textField }))
        .find(Button({ icon: 'times-circle-solid' }))
        .click(),
    );
  },

  clickActionsOnTheRow(row = 0) {
    cy.do(
      MultiColumnListRow({ indexRow: `row-${row}` })
        .find(logsActionButton)
        .click(),
    );
  },

  verifyLogStatus(runByUsername, content) {
    cy.do(
      ListRow({ text: including(runByUsername) })
        .find(MultiColumnListCell({ content }))
        .click(),
    );
  },

  clickActionsRunBy(runByUsername) {
    cy.do(
      ListRow({ text: including(runByUsername) })
        .find(logsActionButton)
        .click(),
    );
  },

  verifyActionsRunBy(name) {
    cy.expect(ListRow({ text: including(`\n${name}\n`) }).exists());
  },

  verifyTriggerLogsAction() {
    cy.expect(triggerBtn.exists());
  },

  verifyLogsRowAction() {
    cy.expect([triggerBtn.exists(), errorsEncounteredBtn.exists()]);
  },

  verifyLogsRowActionWhenCompleted() {
    cy.expect([
      triggerBtn.exists(),
      matchingRecordsBtn.exists(),
      previewPorposedChangesBtn.exists(),
      updatedRecordBtn.exists(),
    ]);
  },

  verifyLogsRowActionWhenNoChangesApplied() {
    cy.expect([
      triggerBtn.exists(),
      matchingRecordsBtn.exists(),
      previewPorposedChangesBtn.exists(),
      errorsCommittingBtn.exists(),
    ]);
  },

  verifyLogsRowActionWhenCompletedWithErrors() {
    cy.expect([
      triggerBtn.exists(),
      matchingRecordsBtn.exists(),
      errorsEncounteredBtn.exists(),
      previewPorposedChangesBtn.exists(),
      updatedRecordBtn.exists(),
      errorsCommittingBtn.exists(),
    ]);
  },

  verifyLogsRowActionWhenCompletedWithErrorsWithoutModification() {
    cy.expect([triggerBtn.exists(), errorsEncounteredBtn.exists()]);
  },

  waitingFileDownload() {
    cy.wait(3000);
  },

  downloadFileUsedToTrigger() {
    cy.do(triggerBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithErrorsEncountered() {
    cy.do(errorsEncounteredBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithMatchingRecords() {
    cy.do(matchingRecordsBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithProposedChanges() {
    cy.do(previewPorposedChangesBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithUpdatedRecords() {
    cy.do(updatedRecordBtn.click());
    this.waitingFileDownload();
  },

  downloadFileWithCommitErrors() {
    cy.do(errorsCommittingBtn.click());
    this.waitingFileDownload();
  },

  verifyLogsTableHeaders(verification = 'exists') {
    cy.get('div[class^="mclScrollable"]')
      .should('exist')
      .scrollTo('right', { ensureScrollable: false });
    cy.expect([
      MultiColumnListHeader('Record type')[verification](),
      MultiColumnListHeader('Status')[verification](),
      MultiColumnListHeader('Editing')[verification](),
      MultiColumnListHeader('# of records')[verification](),
      MultiColumnListHeader('Processed')[verification](),
      MultiColumnListHeader('Started')[verification](),
      MultiColumnListHeader('Ended')[verification](),
      MultiColumnListHeader('Run by')[verification](),
      MultiColumnListHeader('ID')[verification](),
      MultiColumnListHeader('Actions')[verification](),
    ]);
  },

  fillLogsDate(accordion, dataPicker, value) {
    cy.do(Accordion(accordion).find(TextField(dataPicker)).fillIn(value));
  },

  fillLogsStartDate(fromDate, toDate) {
    cy.do([
      logsStartDateAccordion.clickHeader(),
      logsStartDateAccordion.find(textFieldFrom).fillIn(fromDate),
      logsStartDateAccordion.find(textFieldTo).fillIn(toDate),
    ]);
  },

  fillLogsEndDate(fromDate, toDate) {
    cy.do([
      logsEndDateAccordion.clickHeader(),
      logsEndDateAccordion.find(textFieldFrom).fillIn(fromDate),
      logsEndDateAccordion.find(textFieldTo).fillIn(toDate),
    ]);
  },

  applyStartDateFilters() {
    cy.do(logsStartDateAccordion.find(applyBtn).click());
  },

  applyEndDateFilters() {
    cy.do(logsEndDateAccordion.find(applyBtn).click());
  },

  verifyLogsStartedAccordionCollapsed() {
    cy.expect([
      logsStartDateAccordion.has({ open: false }),
      logsStartDateAccordion.find(textFieldFrom).absent(),
      logsStartDateAccordion.find(textFieldTo).absent(),
    ]);
  },

  verifyLogsEndedAccordionCollapsed() {
    cy.expect([
      logsEndDateAccordion.has({ open: false }),
      logsEndDateAccordion.find(textFieldFrom).absent(),
      logsEndDateAccordion.find(textFieldTo).absent(),
    ]);
  },

  verifyDirection(header, direction = 'descending') {
    cy.get('[class^="mclHeader"]')
      .contains(header)
      .then((mclHeader) => {
        const sort = mclHeader.prevObject[1].getAttribute('aria-sort');
        expect(sort).to.eq(direction);
      });
  },

  verifyNoDirection(header) {
    cy.get('[class^="mclHeader"]')
      .contains(header)
      .then((mclHeader) => {
        const sort = mclHeader.prevObject[1].getAttribute('aria-sort');
        expect(sort).to.eq('none');
      });
  },

  clickLogHeader(header) {
    cy.do(MultiColumnListHeader(header).click());
  },

  noLogResultsFound() {
    cy.expect(logsResultPane.find(HTML('No results found. Please check your filters.')).exists());
  },

  verifyLogResultsFound() {
    cy.expect(logsResultPane.find(MultiColumnList()).exists());
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

  isBuildQueryButtonDisabled(isDisabled) {
    cy.expect(buildQueryButton.has({ disabled: isDisabled }));
    cy.wait(2000);
  },
  isConfirmButtonDisabled(isDisabled) {
    cy.expect(confirmChanges.has({ disabled: isDisabled }));
  },

  clickBuildQueryButton() {
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

  searchColumnNameTextfieldDisabled(disabled = true) {
    cy.expect([
      searchColumnNameTextfield.has({ disabled }),
      Checkbox({ disabled: false }).absent(),
    ]);
  },

  verifyElectronicAccessElementByIndex(index, expectedText) {
    cy.get('[class^="ElectronicAccess"]').find('td').eq(index).should('contain.text', expectedText);
  },

  clickClearStartedFilter() {
    cy.do(
      logsStartDateAccordion
        .find(
          Button({ icon: 'times-circle-solid', ariaLabel: including('Clear selected filters') }),
        )
        .click(),
    );
  },
};
