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
  MultiColumnList
} from '../../../../interactors';

const resultsAccordion = Accordion('Preview of record matched');
const errorsAccordion = Accordion('Errors');
const recordIdentifier = Select('Record identifier');

export default {
  verifyCsvViewPermission() {
    cy.expect([
      RadioButton('Inventory - items').has({ disabled: true }),
      Select('Record identifier').has({ disabled: true }),
      Button('or choose file').has({ disabled: true }),
      Button('Actions').absent()
    ]);
  },

  verifyInAppViewPermission() {
    cy.expect([
      RadioButton('Inventory - items').has({ disabled: false }),
      Select('Record identifier').has({ disabled: true }),
      Button('or choose file').has({ disabled: true }),
      Button('Actions').absent()
    ]);
  },

  selectRecordIdentifier(value) {
    cy.do(recordIdentifier.choose(value));
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

  uploadFile(fileName) {
    cy.get('input[type=file]').attachFile(fileName, { allowEmpty: true });
  },

  waitFileUploading() {
    cy.expect(MultiColumnList().exists());
  },

  verifyModalName(name) {
    cy.expect(Modal(name).exists());
    cy.do(Button('Cancel').click());
  },

  verifyMatchedResults(...values) {
    // values: array with cells content
    values.forEach(value => {
      cy.expect(resultsAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
  },

  verifyNonMatchedResults(...values) {
    // values: array with cells content
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

  verifyActionsAfterConductedCSVUploading(errors = true) {
    cy.do(Button('Actions').click());
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
    cy.do(Button('Actions').click());
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
  }
};
