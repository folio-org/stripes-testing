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
  MultiColumnList, Pane, TextArea, including
} from '../../../../interactors';

const resultsAccordion = Accordion('Preview of record matched');
const changesAccordion = Accordion('Preview of record changed');
const errorsAccordion = Accordion('Errors');
const recordIdentifierDropdown = Select('Record identifier');
const recordTypesAccordion = Accordion({ label: 'Record types' });
const actions = Button('Actions');
const radioItems = RadioButton('Inventory - items');
const fileButton = Button('or choose file');
const bulkEditPane = Pane(including('Bulk edit'));
const usersRadio = RadioButton('Users');
const itemsRadio = RadioButton('Inventory - items');
const holdingsRadio = RadioButton('Inventory - holdings');
const identifierToggle = Button('Identifier');
const queryToggle = Button('Query');
const logsToggle = Button('Logs');
const setCriteriaPane = Pane('Set criteria');
const searchButton = Button('Search');
const resetAllButton = Button('Reset all');
const logsStatusesAccordion = Accordion('Statuses');

export default {
  waitLoading() {
    cy.expect(bulkEditPane.exists());
  },

  actionsIsAbsent() {
    cy.expect(actions.absent());
  },

  verifyPanesBeforeImport() {
    cy.expect([
      setCriteriaPane.exists(),
      bulkEditPane.exists(),
    ]);
  },

  verifyBulkEditPaneItems() {
    cy.expect([
      bulkEditPane.find(HTML('Set criteria to start bulk edit')).exists(),
      bulkEditPane.find(HTML('Select a "record identifier" when on the Identifier tab. Enter a "search query" when on the Query tab')).exists(),
    ]);
  },

  verifySetCriteriaPaneItems() {
    cy.expect([
      setCriteriaPane.find(identifierToggle).exists(),
      setCriteriaPane.find(queryToggle).exists(),
      setCriteriaPane.find(logsToggle).exists(),
      setCriteriaPane.find(recordIdentifierDropdown).exists(),
      setCriteriaPane.find(recordTypesAccordion).has({ open: true }),
      setCriteriaPane.find(HTML('Drag and drop')).exists(),
      fileButton.has({ disabled: true })
    ]);
  },

  verifyRecordTypesAccordion() {
    cy.expect([
      recordTypesAccordion.find(HTML('Users')).exists(),
      recordTypesAccordion.find(HTML('Inventory - items')).exists(),
      recordTypesAccordion.find(HTML('Inventory - holdings')).exists(),
    ]);
  },

  verifyRecordIdentifierItems() {
    this.checkUsersRadio();
    cy.expect([
      usersRadio.has({ checked: true }),
      fileButton.has({ disabled: true }),
      recordIdentifierDropdown.find(HTML('User UUIDs')).exists(),
      recordIdentifierDropdown.find(HTML('User Barcodes')).exists(),
      recordIdentifierDropdown.find(HTML('External IDs')).exists(),
      recordIdentifierDropdown.find(HTML('Usernames')).exists(),
      bulkEditPane.find(HTML('Select a "record identifier" when on the Identifier tab. Enter a "search query" when on the Query tab')).exists(),
    ]);
  },

  verifyHoldingIdentifiers() {
    this.checkHoldingsRadio();
    cy.expect([
      holdingsRadio.has({ checked: true }),
      fileButton.has({ disabled: true }),
      recordIdentifierDropdown.find(HTML('Holdings UUIDs')).exists(),
      recordIdentifierDropdown.find(HTML('Holdings HRIDs')).exists(),
      recordIdentifierDropdown.find(HTML('Instance HRIDs')).exists(),
      recordIdentifierDropdown.find(HTML('Item barcodes')).exists(),
      bulkEditPane.find(HTML('Select a "record identifier" when on the Identifier tab. Enter a "search query" when on the Query tab')).exists(),
    ]);
  },

  verifyItemIdentifiers() {
    this.checkItemsRadio();
    cy.expect([
      itemsRadio.has({ checked: true }),
      recordIdentifierDropdown.find(HTML('Item barcode')).exists(),
      recordIdentifierDropdown.find(HTML('Item UUIDs')).exists(),
      recordIdentifierDropdown.find(HTML('Item HRIDs')).exists(),
      recordIdentifierDropdown.find(HTML('Item former identifier')).exists(),
      recordIdentifierDropdown.find(HTML('Item accession number')).exists(),
      recordIdentifierDropdown.find(HTML('Holdings UUIDs')).exists(),
    ]);
  },

  verifyItemIdentifiersDefaultState() {
    this.checkItemsRadio();
    cy.expect([
      itemsRadio.has({ checked: true }),
      recordIdentifierDropdown.find(HTML('Item barcode')).exists(),
      recordIdentifierDropdown.find(HTML('Item UUIDs')).exists(),
      recordIdentifierDropdown.find(HTML('Item HRIDs')).exists(),
      recordIdentifierDropdown.find(HTML('Item former identifier')).exists(),
      recordIdentifierDropdown.find(HTML('Item accession number')).exists(),
      recordIdentifierDropdown.find(HTML('Holdings UUIDs')).exists(),
      bulkEditPane.find(HTML('Select a "record identifier" when on the Identifier tab. Enter a "search query" when on the Query tab')).exists(),
    ]);
  },

  verifyDragNDropItemBarcodeArea() {
    this.checkItemsRadio();
    this.selectRecordIdentifier('Item barcode');
    cy.expect([
      HTML('Select a file with item barcode').exists(),
      HTML('Drag and drop or choose file with item barcode').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropItemUUIDsArea() {
    this.checkItemsRadio();
    this.selectRecordIdentifier('Item UUIDs');
    cy.expect([
      HTML('Select a file with item UUIDs').exists(),
      HTML('Drag and drop or choose file with item UUIDs').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropItemHRIDsArea() {
    this.checkItemsRadio();
    this.selectRecordIdentifier('Item HRIDs');
    cy.expect([
      HTML('Select a file with item HRIDs').exists(),
      HTML('Drag and drop or choose file with item HRIDs').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropItemFormerIdentifierArea() {
    this.checkItemsRadio();
    this.selectRecordIdentifier('Item former identifier');
    cy.expect([
      HTML('Select a file with item former identifier').exists(),
      HTML('Drag and drop or choose file with item former identifier').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropItemHoldingsUUIDsArea() {
    this.checkItemsRadio();
    this.selectRecordIdentifier('Holdings UUIDs');
    cy.expect([
      HTML('Select a file with holdings UUIDs').exists(),
      HTML('Drag and drop or choose file with holdings UUIDs').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropItemAccessionNumberArea() {
    this.checkItemsRadio();
    this.selectRecordIdentifier('Item accession number');
    cy.expect([
      HTML('Select a file with item accession number').exists(),
      HTML('Drag and drop or choose file with item accession number').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropUsersUIIDsArea() {
    this.checkUsersRadio();
    this.selectRecordIdentifier('User UUIDs');
    cy.expect([
      HTML('Select a file with User UUIDs').exists(),
      HTML('Drag and drop or choose file with User UUIDs').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropUsersBarcodesArea() {
    this.checkUsersRadio();
    this.selectRecordIdentifier('User Barcodes');
    cy.expect([
      HTML('Select a file with User Barcodes').exists(),
      HTML('Drag and drop or choose file with User Barcodes').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropExternalIDsArea() {
    this.checkUsersRadio();
    this.selectRecordIdentifier('External IDs');
    cy.expect([
      HTML('Select a file with External IDs').exists(),
      HTML('Drag and drop or choose file with External IDs').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropUsernamesArea() {
    this.checkUsersRadio();
    this.selectRecordIdentifier('Usernames');
    cy.expect([
      HTML('Select a file with Usernames').exists(),
      HTML('Drag and drop or choose file with Usernames').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropUpdateUsersArea() {
    cy.expect(HTML('Select a file with record identifiers').exists());
  },

  verifyDragNDropHoldingsUUIDsArea() {
    this.checkHoldingsRadio();
    this.selectRecordIdentifier('Holdings UUIDs');
    cy.expect([
      HTML('Select a file with holdings UUIDs').exists(),
      HTML('Drag and drop or choose file with holdings UUIDs').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropHoldingsHRIDsArea() {
    this.checkHoldingsRadio();
    this.selectRecordIdentifier('Holdings HRIDs');
    cy.expect([
      HTML('Select a file with holdings HRIDs').exists(),
      HTML('Drag and drop or choose file with holdings HRIDs').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropInstanceHRIDsArea() {
    this.checkHoldingsRadio();
    this.selectRecordIdentifier('Instance HRIDs');
    cy.expect([
      HTML('Select a file with instance HRIDs').exists(),
      HTML('Drag and drop or choose file with instance HRIDs').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  verifyDragNDropHoldingsItemBarcodesArea() {
    this.checkHoldingsRadio();
    this.selectRecordIdentifier('Item barcodes');
    cy.expect([
      HTML('Select a file with item barcode').exists(),
      HTML('Drag and drop or choose file with item barcode').exists(),
      fileButton.has({ disabled: false }),
    ]);
  },

  openQuerySearch() {
    cy.do(queryToggle.click());
  },

  openLogsSearch() {
    cy.do(logsToggle.click());
  },

  verifyQueryPane() {
    cy.expect([
      queryToggle.has({ default: false }),
      TextArea().has({ disabled: true }),
      searchButton.has({ disabled: true }),
      resetAllButton.has({ disabled: true }),
      recordTypesAccordion.has({ open: true }),
      recordTypesAccordion.find(usersRadio).has({ disabled: true }),
      recordTypesAccordion.find(itemsRadio).has({ disabled: true }),
      recordTypesAccordion.find(holdingsRadio).has({ disabled: true }),
    ]);
    this.verifyBulkEditPaneItems();
  },

  verifyLogsPane() {
    cy.expect([
      logsToggle.has({ default: false }),
      resetAllButton.has({ disabled: true }),
      logsStatusesAccordion.has({ open: true }),
      logsStatusesAccordion.find(Checkbox('New')).has({ checked: false }),
      logsStatusesAccordion.find(Checkbox('Retrieving records')).has({ checked: false }),
      logsStatusesAccordion.find(Checkbox('Saving records')).has({ checked: false }),
      logsStatusesAccordion.find(Checkbox('Data modification')).has({ checked: false }),
      logsStatusesAccordion.find(Checkbox('Reviewing changes')).has({ checked: false }),
      logsStatusesAccordion.find(Checkbox('Completed')).has({ checked: false }),
      logsStatusesAccordion.find(Checkbox('Completed with errors')).has({ checked: false }),
      logsStatusesAccordion.find(Checkbox('Failed')).has({ checked: false }),
      recordTypesAccordion.find(Checkbox('Users')).has({ checked: false }),
      recordTypesAccordion.find(Checkbox('Inventory - items')).has({ checked: false }),
      recordTypesAccordion.find(Checkbox('Inventory - holdings')).has({ checked: false }),
      Accordion('Start date').has({ open: false }),
      Accordion('End date').has({ open: false }),
      bulkEditPane.find(HTML('Enter search criteria to start search')).exists(),
      bulkEditPane.find(HTML('Choose a filter or enter a search query to show results.')).exists(),
    ]);
  },

  verifyCsvViewPermission() {
    cy.expect([
      radioItems.has({ disabled: true }),
      recordIdentifierDropdown.has({ disabled: true }),
      fileButton.has({ disabled: true }),
      actions.absent()
    ]);
  },

  verifyUsersUpdatePermission() {
    cy.expect([
      radioItems.has({ disabled: true }),
      recordIdentifierDropdown.has({ disabled: false }),
      fileButton.has({ disabled: true }),
      actions.absent(),
    ]);
  },

  verifyInAppViewPermission() {
    cy.expect([
      radioItems.has({ disabled: false }),
      recordIdentifierDropdown.has({ disabled: true }),
      fileButton.has({ disabled: true }),
      actions.absent()
    ]);
  },

  selectRecordIdentifier(value) {
    cy.do(recordIdentifierDropdown.choose(value));
  },

  clickToBulkEditMainButton() {
    cy.do(Button({ id: 'ModuleMainHeading' }).click());
  },

  verifyDefaultFilterState() {
    cy.expect([
      Button('or choose file').has({ disabled: true }),
      HTML('Select record identifier').exists()
    ]);
    this.verifyBulkEditPaneItems();
  },

  verifyInputLabel(name) {
    cy.expect(HTML(name).exists());
  },

  checkUsersRadio() {
    cy.do(usersRadio.click());
  },

  usersRadioIsDisabled(isDisabled) {
    cy.expect(usersRadio.has({ disabled: isDisabled }));
  },

  checkItemsRadio() {
    cy.do(itemsRadio.click());
  },

  itemsRadioIsDisabled(isDisabled) {
    cy.expect(itemsRadio.has({ disabled: isDisabled }));
  },

  checkHoldingsRadio() {
    cy.do(holdingsRadio.click());
  },

  itemsHoldingsIsDisabled(isDisabled) {
    cy.expect(holdingsRadio.has({ disabled: isDisabled }));
  },

  uploadFile(fileName) {
    cy.do(Button('or choose file').has({ disabled: false }));
    cy.get('input[type=file]').attachFile(fileName, { allowEmpty: true });
  },

  waitFileUploading() {
    // it is needed to avoid triggering for previous page list
    cy.wait(3000);
    cy.expect(MultiColumnList().exists());
  },

  verifyModalName(name) {
    cy.expect(Modal(name).exists());
    cy.do(Button('Cancel').click());
  },

  verifyMatchedResults(...values) {
    values.forEach(value => {
      cy.expect(resultsAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
    cy.expect(resultsAccordion.has({ itemsAmount: (values.length).toString() }));
  },

  matchedAccordionIsAbsent() {
    cy.expect(resultsAccordion.absent());
  },

  verifyUserBarcodesResultAccordion() {
    cy.expect([
      MultiColumnListHeader('Active').exists(),
      MultiColumnListHeader('Last name').exists(),
      MultiColumnListHeader('First name').exists(),
      MultiColumnListHeader('Barcode').exists(),
      MultiColumnListHeader('Patron group').exists(),
      MultiColumnListHeader('Username').exists(),
    ]);
  },

  verifyChangedResults(...values) {
    values.forEach(value => {
      cy.expect(changesAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
    cy.expect(bulkEditPane.find(HTML(`${values.length} records have been successfully changed`)).exists());
  },

  verifyLocationChanges(rows, locationValue) {
    for (let i = 0; i < rows; i++) {
      cy.expect(changesAccordion.find(MultiColumnListCell({ row: i, content: locationValue })).exists());
    }
  },

  verifyNonMatchedResults(...values) {
    cy.expect([
      errorsAccordion.find(MultiColumnListHeader('Record identifier')).exists(),
      errorsAccordion.find(MultiColumnListHeader('Reason for error')).exists(),
    ]);
    values.forEach(value => {
      cy.expect(errorsAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
  },

  verifyErrorLabel(fileName, validRecordCount, invalidRecordCount) {
    cy.expect(HTML(`${fileName}: ${validRecordCount + invalidRecordCount} entries * ${validRecordCount} records matched * ${invalidRecordCount} errors`).exists());
  },

  verifyErrorLabelAfterChanges(fileName, validRecordCount, invalidRecordCount) {
    cy.expect(Accordion('Errors').find(HTML(`${fileName}: ${validRecordCount + invalidRecordCount} entries * ${validRecordCount} records changed * ${invalidRecordCount} errors`)).exists());
  },

  verifyActionsAfterConductedCSVUploading(errors = true) {
    cy.do(actions.click());
    cy.expect([
      Button('Download matched records (CSV)').exists(),
      Button('Start bulk edit (CSV)').exists(),
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
    ]);
    if (errors) {
      cy.expect(Button('Download errors (CSV)').exists());
    }
  },

  verifyUsersActionShowColumns() {
    cy.expect([
      DropdownMenu().find(Checkbox('Active')).exists(),
      DropdownMenu().find(Checkbox('Last name')).exists(),
      DropdownMenu().find(Checkbox('First name')).exists(),
      DropdownMenu().find(Checkbox('Barcode')).exists(),
      DropdownMenu().find(Checkbox('Patron group')).exists(),
      DropdownMenu().find(Checkbox('Username')).exists(),
      DropdownMenu().find(Checkbox('Email')).exists(),
      DropdownMenu().find(Checkbox('Expiration date')).exists(),
    ]);
  },

  verifyHoldingActionShowColumns() {
    cy.expect([
      DropdownMenu().find(Checkbox({ name: 'Holdings HRID', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Permanent location', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Temporary location', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Call number prefix', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Call number', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Call number suffix', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Holdings type', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Effective location', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Holdings ID', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Source', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Suppressed from discovery', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Call number type', checked: false })).exists(),
    ]);
  },

  verifyItemsActionDropdownItems() {
    cy.expect([
      DropdownMenu().find(Checkbox({ name: 'Barcode', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Status', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Item effective location', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Effective call number', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Item HRID', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Material type', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Permanent loan type', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Temporary loan type', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Item identifier', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Accession number', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Item permanent location', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Item temporary location', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Copy number', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Enumeration', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Chronology', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'Volume', checked: false })).exists(),
    ]);
  },

  changeShowColumnCheckbox(name) {
    cy.do(DropdownMenu().find(Checkbox(name)).click());
  },

  verifyResultColumTitles(title) {
    cy.expect(resultsAccordion.find(MultiColumnListHeader(title)).exists());
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
    cy.expect([
      recordTypesAccordion.has({ open: false }),
      usersRadio.absent(),
      itemsRadio.absent(),
      holdingsRadio.absent(),
    ]);
  }
};
