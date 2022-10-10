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
      recordTypes.find(HTML('Inventory - items')).exists()
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

  verifyDragNDropUsersUIIDsArea() {
    this.checkUsersRadio();
    this.selectRecordIdentifier('User UUIDs');
    cy.expect([
      HTML('Select a file with User UUIDs').exists(),
      actions.exists()
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

  uploadFile(fileName) {
    cy.do(Button('or choose file').has({ disabled: false }));
    cy.get('input[type=file]').attachFile(fileName, { allowEmpty: true });
  },

  waitFileUploading() {
    // it is needed to avoid triggering for previous page list
    cy.wait(1000);
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
      MultiColumnListHeader('Status').exists(),
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
    cy.expect(HTML(`${fileName}: ${validRecordCount + invalidRecordCount} entries * ${validRecordCount} records changed * ${invalidRecordCount} errors`).exists());
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
      DropdownMenu().find(Checkbox('Status')).exists(),
      DropdownMenu().find(Checkbox('Last name')).exists(),
      DropdownMenu().find(Checkbox('First name')).exists(),
      DropdownMenu().find(Checkbox('Barcode')).exists(),
      DropdownMenu().find(Checkbox('Patron group')).exists(),
      DropdownMenu().find(Checkbox('Username')).exists(),
      DropdownMenu().find(Checkbox('Email')).exists(),
      DropdownMenu().find(Checkbox('Expiration date')).exists(),
    ]);
  },

  verifyItemsActionDropdownItems() {
    cy.expect([
      DropdownMenu().find(Checkbox({ name: 'barcode', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'status', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'effectiveLocation', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'callNumber', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'hrid', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'materialType', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'permanentLoanType', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'temporaryLoanType', checked: true })).exists(),
      DropdownMenu().find(Checkbox({ name: 'id', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'formerIds', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'accessionNumber', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'permanentLocation', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'temporaryLocation', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'copyNumber', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'enumeration', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'chronology', checked: false })).exists(),
      DropdownMenu().find(Checkbox({ name: 'volume', checked: false })).exists(),
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
  }
};
