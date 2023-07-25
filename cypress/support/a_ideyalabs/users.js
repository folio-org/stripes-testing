import {
  Accordion,
  Button,
  Checkbox,
  KeyValue,
  Link,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneContent,
  RichEditor,
  Section,
  Select,
  TextField,
} from '../../../interactors';
import topMenu from '../fragments/topMenu';

const titleField = TextField({ name: 'title' });
const detailsField = RichEditor('Details');
const submitButton = Button({ type: 'submit' });
const newButton = Button('New');
const checkOutApp = Checkbox({ name: 'popUpOnCheckOut' });
const checkOut = TextField({ id: 'input-patron-identifier' });
const patronButton = Button({ id: 'clickable-find-patron' });
const userNoteModal = Modal('User note');
const searchField = TextField({ id: 'input-user-search' });
const searchButton = Button('Search');
const usersPane = PaneContent({ id: 'users-search-results-pane-content' });
const renewButton = Button('Renew');

export default {
  createNote: (title, details) => {
    cy.expect(Accordion({ id: 'notesAccordion' }).exists());
    cy.do([
      Accordion({ id: 'notesAccordion' }).clickHeader(),
      newButton.click(),
      titleField.fillIn(title),
      detailsField.fillIn(details),
      checkOutApp.click(),
      submitButton.click(),
    ]);
  },

  editNote: (title, details) => {
    cy.expect(Accordion({ id: 'notesAccordion' }).exists());
    cy.do([
      Accordion({ id: 'notesAccordion' }).clickHeader(),
      Section({ id: 'notesAccordion' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(Button('Edit'))
        .click(),
      titleField.clear(),
      titleField.fillIn(title),
      detailsField.fillIn(details),
      submitButton.click(),
    ]);
  },

  selectRecord: (userName) => {
    cy.do(usersPane.find(Select(userName)).click());
  },

  selectUserRecord: (content) => {
    cy.do(usersPane.find(Link(content)).click());
  },

  getBarcode: () => cy.then(() => KeyValue('Barcode').value()),

  getUserBarcode() {
    this.getBarcode().then((barcode) => {
      cy.visit(topMenu.checkOutPath);
      cy.do([
        checkOut.fillIn(barcode),
        patronButton.click(),
        userNoteModal.find(Button('Close')).click(),
      ]),
      cy.visit(topMenu.usersPath),
      cy.do([
        Select({ id: 'input-user-search-qindex' }).choose('Barcode'),
        searchField.fillIn(barcode),
        searchButton.click(),
      ]);
    });
  },

  enterBardcodeCheckout: (barcode) => {
    cy.do([checkOut.fillIn(barcode), patronButton.click()]);
  },

  dueDate: (rowIndex = 0) => {
    cy.wrap(MultiColumnListCell({ row: rowIndex, columnIndex: 3 }).text()).as(
      'date'
    );
    cy.get('@date').then((val) => {
      // here log is used to print the due date
      cy.log(val);
    });
  },

  getOpenLoans: () => cy.then(() => KeyValue('Open loans').value()),

  clickOpenLoansCount() {
    this.getOpenLoans().then((val) => {
      cy.do(
        Section({ id: 'patron-details' })
          .find(KeyValue('Open loans'))
          .find(Link(val))
          .click()
      );
    });
  },

  renewButton: () => {
    cy.expect(renewButton.exists());
    cy.do(renewButton.click());
  },
};
