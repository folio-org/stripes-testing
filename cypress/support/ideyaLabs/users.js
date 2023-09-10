import {
  Accordion,
  Button,
  Checkbox,
  HTML,
  KeyValue,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneContent,
  RichEditor,
  Section,
  Select,
  TextArea,
  TextField,
  including,
} from '../../../interactors';
import topMenu from '../fragments/topMenu';
import getRandomPostfix from '../utils/stringTools';

const titleField = TextField({ name: 'title' });
const detailsField = RichEditor('Details');
const submitButton = Button({ type: 'submit' });
const newButton = Button('New');
const checkOutApp = Checkbox({ name: 'popUpOnCheckOut' });
const userNoteModal = Modal('User note');
const searchField = TextField({ id: 'input-user-search' });
const searchButton = Button('Search');
const usersPane = PaneContent({ id: 'users-search-results-pane-content' });
const renewButton = Button('Renew');
const patronBarcodeTextField = TextField({ id: 'input-patron-identifier' });
const itemBarcodeTextField = TextField({ id: 'input-item-barcode' });
const patronButton = Button({ id: 'clickable-find-patron' });
const itemButton = Button({ id: 'clickable-add-item' });
const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const deleteButtonInConfirmation = Button({ id: 'clickable-confirm-delete-note-confirm' });
const title = `Test Title ${getRandomPostfix()}`;

export default {
  createNote: (details) => {
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

  editNote: (details) => {
    cy.expect(Accordion({ id: 'notesAccordion' }).exists());
    cy.do([
      Accordion({ id: 'notesAccordion' }).clickHeader(),
      Section({ id: 'notesAccordion' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(Button('Edit'))
        .click(),
      detailsField.fillIn(details),
      submitButton.click(),
    ]);
  },

  deleteNote: () => {
    cy.do([
      actionsButton.click(),
      deleteButton.click(),
      deleteButtonInConfirmation.click(),
      Accordion({ id: 'notesAccordion' }).clickHeader(),
    ]);
  },

  verifyNoteExist: () => {
    cy.expect(
      Section({ id: 'notesAccordion' })
        .find(MultiColumnListRow({ index: 0, content: title }))
        .exists(),
    );
  },

  verifyNoteAbsent: () => {
    cy.expect(
      Section({ id: 'notesAccordion' })
        .find(MultiColumnListRow({ index: 0, content: title }))
        .absent(),
    );
  },

  openNote: () => {
    cy.expect(Accordion({ id: 'notesAccordion' }).exists());
    cy.do([
      Accordion({ id: 'notesAccordion' }).clickHeader(),
      Section({ id: 'notesAccordion' })
        .find(MultiColumnListRow({ index: 0 }))
        .click(),
    ]);
  },

  selectRecord: (userName) => {
    cy.expect(usersPane.find(Select(userName)).exists());
    cy.do(usersPane.find(Select(userName)).click());
  },

  selectUserRecord: (content) => {
    cy.expect(usersPane.find(Link(content)).exists());
    cy.do(usersPane.find(Link(content)).click());
  },

  getBarcode: () => cy.then(() => KeyValue('Barcode').value()),

  getUserBarcode() {
    this.getBarcode().then((barcode) => {
      cy.visit(topMenu.checkOutPath);
      cy.expect(patronBarcodeTextField.exists());
      cy.do([
        patronBarcodeTextField.fillIn(barcode),
        patronButton.click(),
        userNoteModal.find(Button('Close')).click(),
      ]);
      cy.visit(topMenu.usersPath);
      cy.do([
        Select({ id: 'input-user-search-qindex' }).choose('Barcode'),
        searchField.fillIn(barcode),
        searchButton.click(),
      ]);
    });
  },

  enterPatronBarcodeCheckOut: (patronBarcode) => {
    cy.expect(patronBarcodeTextField.exists());
    cy.do(patronBarcodeTextField.fillIn(patronBarcode));
    cy.expect(patronButton.exists());
    cy.do(patronButton.click());
  },

  enterItemBarcodeCheckOut: (searchItemBarcode) => {
    cy.expect(itemBarcodeTextField.exists());
    cy.do(itemBarcodeTextField.fillIn(searchItemBarcode));
    cy.expect(itemButton.exists());
    cy.do(itemButton.click());
  },

  closeButton: () => {
    cy.expect(Modal('Patron blocked from borrowing').find(Button('Close')).exists());
    cy.do(Modal('Patron blocked from borrowing').find(Button('Close')).click());
  },

  cancelButton: () => {
    cy.expect(Modal('Override patron block').find(Button('Cancel')).exists());
    cy.do(Modal('Override patron block').find(Button('Cancel')).click());
  },

  saveAndCloseButton: () => {
    cy.expect(TextArea({ type: 'text' }).exists());
    cy.do([TextArea({ type: 'text' }).fillIn('test'), Button('Save & close').click()]);
  },

  patronOverride: () => {
    cy.expect(Modal('Patron blocked from borrowing').find(Button('Override')).exists());
    cy.do([Modal('Patron blocked from borrowing').find(Button('Override')).click()]);
  },

  dueDate: (rowIndex = 0) => {
    cy.wrap(MultiColumnListCell({ row: rowIndex, columnIndex: 3 }).text()).as('date');
    cy.get('@date').then((val) => {
      // here log is used to print the due date
      cy.log(val);
    });
  },

  getOpenLoans: () => cy.then(() => KeyValue('Open loans').value()),

  clickOpenLoansCount() {
    this.getOpenLoans().then((val) => {
      cy.expect(Section({ id: 'patron-details' }).find(KeyValue('Open loans')).exists());
      cy.do(Section({ id: 'patron-details' }).find(KeyValue('Open loans')).find(Link(val)).click());
    });
  },

  renewButton: () => {
    cy.expect(renewButton.exists());
    cy.do(renewButton.click());
  },

  checkRenewConfirmationModal: () => {
    cy.expect(Modal({ id: 'bulk-renewal-modal-label' }).exists());
  },

  verifyItemBarcode: (barcode) => {
    cy.expect(
      MultiColumnList({ id: 'list-loanshistory' })
        .find(HTML(including(barcode)))
        .exists(),
    );
  },
};
