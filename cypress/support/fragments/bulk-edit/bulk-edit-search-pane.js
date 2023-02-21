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
const recordIdentifier = Select('Record identifier');
const recordTypes = Accordion({ label: 'Record types' });
const actions = Button('Actions');
const radioItems = RadioButton('Inventory - items');
const fileBtn = Button('or choose file');
const bulkEditPane = Pane(including('Bulk edit'));

export default {
  waitLoading() {
    cy.expect(bulkEditPane.exists());
  },

  actionsIsShown() {
    cy.expect(actions.exists());
  },

  actionsIsAbsent() {
    cy.expect(actions.absent());
  },

  verifyPanesBeforeImport() {
    cy.expect([
      Pane('Set criteria').exists(),
      bulkEditPane.exists(),
    ]);
  },

  verifyBulkEditPaneItems() {
    cy.expect([
      bulkEditPane.find(HTML('Set criteria to start bulk edit')).exists(),
    ]);
  },

  verifySetCriteriaPaneItems() {
    cy.expect([
      Button('Identifier').exists(),
      Button('Query').exists(),
      recordIdentifier.exists(),
      recordIdentifier.find(HTML('Select record identifier')).exists(),
      Accordion({ label: 'Record types', open: true }).exists(),
      HTML('Drag and drop').exists()
    ]);
  },

  verifyRecordsTypeItems() {
    cy.expect([
      recordTypes.find(HTML('Users')).exists(),
      recordTypes.find(HTML('Inventory - items')).exists(),
      recordTypes.find(HTML('Inventory - holdings')).exists(),
    ]);
    this.checkUsersRadio();
    cy.do(recordTypes.clickHeader());
    cy.expect(Accordion({ label: 'Record types', open: false }).exists());
    cy.do(recordTypes.clickHeader());
    cy.expect(RadioButton({ text: 'Users', checked: true }).exists());
  },

  verifyRecordIdentifierItems() {
    cy.expect([
      recordIdentifier.find(HTML('User UUIDs')).exists(),
      recordIdentifier.find(HTML('User Barcodes')).exists(),
      recordIdentifier.find(HTML('External IDs')).exists(),
      recordIdentifier.find(HTML('Usernames')).exists(),
    ]);
  },

  verifyHoldingIdentifiers() {
    cy.expect([
      recordIdentifier.find(HTML('Holdings UUIDs')).exists(),
      recordIdentifier.find(HTML('Holdings HRIDs')).exists(),
      recordIdentifier.find(HTML('Instance HRIDs')).exists(),
      recordIdentifier.find(HTML('Item barcodes')).exists(),
    ]);
  },

  verifyDragNDropHoldingsUUIDsArea() {
    cy.expect([
      HTML('Drag and drop or choose file with holdings UUIDs').exists(),
      Button('or choose file').has({ visible: true }),
      HTML('Select a file with holdings UUIDs').exists(),
    ]);
  },

  verifyDragNDropUsersUIIDsArea() {
    this.checkUsersRadio();
    this.selectRecordIdentifier('User UUIDs');
    cy.expect([
      HTML('Select a file with User UUIDs').exists(),
    ]);
  },

  verifyDragNDropUpdateUsersArea() {
    cy.expect(HTML('Select a file with record identifiers').exists());
  },

  verifyDragNDropExternalIDsArea() {
    cy.expect(HTML('Select a file with External IDs').exists());
  },

  verifyDragNDropUsernamesArea() {
    cy.expect(HTML('Select a file with Usernames').exists());
  },

  verifyDragNDropUsersBarcodesArea() {
    this.checkUsersRadio();
    this.selectRecordIdentifier('User Barcodes');
    cy.expect(HTML('Select a file with User Barcodes').exists());
  },

  openQuerySearch() {
    cy.do(Button('Query').click());
  },

  verifyEmptyQueryPane() {
    cy.expect([
      TextArea().exists(),
      Button({ text: 'Search', disabled: true }).exists(),
      Button({ text: 'Reset all', disabled: true }).exists(),
      Accordion({ label: 'Record types', open: true }).exists()
    ]);
  },

  fillQuery(text) {
    cy.do(TextArea().fillIn(text));
  },

  verifyFilledQueryPane() {
    cy.expect([
      TextArea().exists(),
      Button({ text: 'Search', disabled: false }).exists(),
      Button({ text: 'Reset all', disabled: false }).exists(),
      Accordion({ label: 'Record types', open: true }).exists()
    ]);
  },

  resetQueryField() {
    cy.do([
      Button('Reset all').click(),
      Button('Identifier').click()
    ]);
  },

  verifyCsvViewPermission() {
    cy.expect([
      radioItems.has({ disabled: true }),
      recordIdentifier.has({ disabled: true }),
      fileBtn.has({ disabled: true }),
      actions.absent()
    ]);
  },

  verifyUsersUpdatePermission() {
    cy.expect([
      radioItems.has({ disabled: true }),
      recordIdentifier.has({ disabled: false }),
      fileBtn.has({ disabled: true }),
      actions.absent(),
    ]);
  },

  verifyInAppViewPermission() {
    cy.expect([
      radioItems.has({ disabled: false }),
      recordIdentifier.has({ disabled: true }),
      fileBtn.has({ disabled: true }),
      actions.absent()
    ]);
  },

  selectRecordIdentifier(value) {
    cy.do(recordIdentifier.choose(value));
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

  verifyItemIdentifiers() {
    cy.expect([
      recordIdentifier.find(HTML('Item barcode')).exists(),
      recordIdentifier.find(HTML('Item UUIDs')).exists(),
      recordIdentifier.find(HTML('Item HRIDs')).exists(),
      recordIdentifier.find(HTML('Item former identifier')).exists(),
      recordIdentifier.find(HTML('Item accession number')).exists(),
      recordIdentifier.find(HTML('Holdings UUIDs')).exists(),
    ]);
  },

  verifyInputLabel(name) {
    cy.expect(HTML(name).exists());
  },

  checkUsersRadio() {
    cy.do(RadioButton('Users').click());
  },

  checkItemsRadio() {
    cy.do(RadioButton('Inventory - items').click());
  },

  checkHoldingsRadio() {
    cy.do(RadioButton('Inventory - holdings').click());
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
};
