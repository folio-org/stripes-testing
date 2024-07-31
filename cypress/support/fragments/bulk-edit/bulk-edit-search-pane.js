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
} from '../../../../interactors';

const bulkEditIcon = Image({ alt: 'View and manage bulk edit' });
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
const identifierToggle = Button('Identifier');
const queryToggle = Button('Query');
const logsToggle = Button('Logs');
const setCriteriaPane = Pane('Set criteria');
const saveAndClose = Button('Save and close');
const confirmChanges = Button('Confirm changes');
const buildQueryButton = Button('Build query');
const searchColumnNameTextfield = TextField({ placeholder: 'Search column name' });
const areYouSureForm = Modal('Are you sure?');

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

  actionsIsAbsent() {
    cy.expect(actions.absent());
  },

  verifyPopulatedPreviewPage() {
    cy.expect([errorsAccordion.exists(), resultsAccordion.exists(), actions.exists()]);
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

  verifyExactChangesUnderColumnsByRow(columnName, value, row = 0) {
    cy.expect(
      areYouSureForm
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
        Button('Start bulk edit - Instance fields').exists(),
        Button('Start bulk edit - MARC fields').exists(),
      ]);
    } else {
      cy.expect(Button('Start bulk edit').exists());
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
      DropdownMenu().find(Checkbox('Holdings UUID')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings HRID')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Holdings type')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Former holdings Id')).has({ checked: false }),
      DropdownMenu()
        .find(Checkbox('Instance (Title, Publisher, Publication date)'))
        .has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings permanent location')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Holdings temporary location')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Electronic access')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings level call number type')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings level call number prefix')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings level call number')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings level call number suffix')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Shelving title')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Acquisition method')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Receipt status')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Note')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Administrative note')).has({ checked: false }),
      DropdownMenu().find(Checkbox('ILL policy')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Retention policy')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Digitization policy')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings statement')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings statement for indexes')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings statement for supplements')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Holdings copy number')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Number of items')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Suppress from discovery')).has({ checked: true }),
      DropdownMenu().find(Checkbox('Statistical codes')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Tags')).has({ checked: false }),
      DropdownMenu().find(Checkbox('Source')).has({ checked: true }),
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
      this.verifyResultColumnTitlesDoNotInclude(name);
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

  verifyRecordTypesSortedAlphabetically() {
    const locator = '[class*="labelText"]';
    cy.get(locator).then((checkboxes) => {
      const textArray = checkboxes.get().map((el) => el.innerText);
      const sortedArray = [...textArray].sort((a, b) => a - b);
      expect(sortedArray).to.eql(textArray);
    });
  },

  verifyResultColumnTitles(title) {
    cy.expect(resultsAccordion.find(MultiColumnListHeader(title)).exists());
  },

  verifyResultColumnTitlesDoNotInclude(title) {
    cy.expect(resultsAccordion.find(MultiColumnListHeader(title)).absent());
  },

  verifyAreYouSureColumnTitlesDoNotInclude(title) {
    cy.expect(areYouSureForm.find(MultiColumnListHeader(title)).absent());
  },

  verifyChangedColumnTitlesDoNotInclude(title) {
    cy.expect(changesAccordion.find(MultiColumnListHeader(title)).absent());
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
  isConfirmButtonDisabled(isDisabled) {
    cy.expect(confirmChanges.has({ disabled: isDisabled }));
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

  searchColumnNameTextfieldDisabled(disabled = true) {
    cy.expect([
      searchColumnNameTextfield.has({ disabled }),
      Checkbox({ disabled: false }).absent(),
    ]);
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

  verifyRowHasEmptyElectronicAccess(index) {
    cy.get(`[data-row-index="row-${index}"]`).find('table').should('not.exist');
  },
};
