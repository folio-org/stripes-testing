import { HTML } from '@interactors/html';
import {
  Accordion,
  Button, Checkbox, DropdownMenu,
  Modal,
  MultiColumnListCell, MultiColumnListHeader,
  RadioButton,
  Select
} from '../../../../interactors';
import MultiColumnList from '../../../../interactors/multi-column-list';

const resultsAccordion = Accordion('Preview of record matched');
const errorsAccordion = Accordion('Errors');

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
    cy.do(Select('Record identifier').choose(value));
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

  verifyMatchedResults(values) {
    // values: array with cells content
    values.forEach(value => {
      cy.expect(resultsAccordion.find(MultiColumnListCell({ content: value })).exists());
    });
  },

  verifyNonMatchedResults(values) {
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

  verifyActionsAfterConductedUploading() {
    cy.do(Button('Actions').click());
    cy.expect([
      Button('Download matched records (CSV)').exists(),
      Button('Download errors (CSV)').exists(),
      Button('Start bulk edit (CSV)').exists(),
      DropdownMenu().find(HTML('Show columns')).exists(),
    ]);
  },

  verifyActionShowColumns() {
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

  changeShowColumnCheckbox(name) {
    cy.do(DropdownMenu().find(Checkbox(name)).click());
  },

  verifyResultColumTitles(title) {
    cy.expect(resultsAccordion.find(MultiColumnListHeader(title)).exists());
  }
};
