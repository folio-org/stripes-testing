import { HTML, including } from '@interactors/html';
import {
  TextField,
  Button,
  Link,
  Label,
  KeyValue,
  Pane,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  PaneContent,
  Checkbox,
} from '../../../../interactors';
import SelectUser from './selectUser';

const modal = Modal('Confirm multipiece check out');
const endSessionButton = Button('End session');
const userPane = PaneContent({ id: 'patron-details-content' });
const modalForDeliveryRequest = Modal('Route for delivery request');

function addPatron(userName) {
  cy.do(Button({ id: 'clickable-find-user' }).click());
  SelectUser.searchUser(userName);
  SelectUser.selectUserFromList(userName);
}

export default {
  modal,
  addPatron,
  checkOutUser(userBarcode, otherParameter) {
    return cy.do([
      TextField('Patron identifier').fillIn(otherParameter || userBarcode),
      Pane('Scan patron card').find(Button('Enter')).click(),
      Button(userBarcode).exists(),
    ]);
  },
  checkUserInfo({ barcode, personal }, patronGroup = '0') {
    return cy.expect([
      userPane.find(KeyValue({ value: 'Active' })).exists(),
      userPane.find(KeyValue({ value: patronGroup })).exists(),
      userPane.find(Link(including(personal.lastname + ', '))).exists(),
      userPane.find(Link(barcode)).exists(),
    ]);
  },
  checkOutUserByBarcode({ barcode, lastName: lastname, patronGroup }) {
    this.checkOutUser(barcode);
    this.checkUserInfo({ barcode, personal: { lastname } }, patronGroup.name);
  },
  checkOutItem(itemBarcode) {
    return cy.do([
      TextField('Item ID').fillIn(itemBarcode),
      Pane('Scan items').find(Button('Enter')).click(),
    ]);
  },
  checkItemInfo(itemBarcode, instanceTitle) {
    cy.expect([
      MultiColumnList({ rowCount: 1 }).find(MultiColumnListCell('1')).exists(),
      MultiColumnList({ rowCount: 1 }).find(MultiColumnListCell(itemBarcode)).exists(),
      MultiColumnList({ rowCount: 1 }).find(MultiColumnListCell(instanceTitle)).exists(),
      Label('Total items scanned: 1').exists(),
    ]);
  },

  checkItemDueDate(date) {
    cy.expect(
      MultiColumnList({ rowCount: 1 })
        .find(HTML(including(date)))
        .exists(),
    );
  },

  checkOutItemUser(userBarcode, itemBarcode) {
    cy.do(TextField({ name: 'patron.identifier' }).fillIn(userBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(Button({ id: 'clickable-find-patron' }).click());
    cy.expect(KeyValue('Borrower').exists());
    cy.wait('@getLoans');
    // need to wait until data to loaded
    cy.wait(1500);
    cy.do(TextField({ name: 'item.barcode' }).fillIn(itemBarcode));
    cy.do(Button({ id: 'clickable-add-item' }).click());
    // waiters needs for check out item in loop
    cy.wait(1500);
  },

  endCheckOutSession: () => {
    cy.do(endSessionButton.click());
    cy.expect(endSessionButton.absent());
  },

  endCheckOutSessionAutomatically: () => {
    // this timeout is needed to wait 60 seconds until the action is automatically done
    cy.intercept('/circulation/end-patron-action-session').as('end-patron-session');
    cy.wait('@end-patron-session', { timeout: 99000 }).then((xhr) => {
      cy.wrap(xhr.response.statusCode).should('eq', 204);
    });
    cy.expect(endSessionButton.absent());
  },

  checkIsInterfacesOpened: () => {
    cy.expect(Pane('Scan patron card').exists());
    cy.expect(Pane('Scan items').exists());
  },

  checkPatronInformation: () => {
    cy.expect(KeyValue('Borrower').exists());
    cy.expect(KeyValue('Status').exists());
  },

  checkItem: (barcode) => {
    cy.expect(
      MultiColumnList({ id: 'list-items-checked-out' })
        .find(HTML(including(barcode)))
        .absent(),
    );
  },

  confirmMultipieceCheckOut(barcode) {
    cy.do(modal.find(Button('Check out')).click());
    cy.expect(
      MultiColumnList({ id: 'list-items-checked-out' })
        .find(HTML(including(barcode)))
        .exists(),
    );
  },

  cancelMultipleCheckOutModal: () => {
    cy.do(modal.find(Button('Cancel')).click());
    cy.expect(modal.absent());
  },

  openLoanDetails() {
    cy.do(Button({ id: 'available-item-actions-button' }).click());
    cy.do(Button('Loan details').click());
    cy.expect(Pane({ id: 'pane-loandetails' }).exists());
  },

  changeDueDateToPast(minutes) {
    const todayFormatted = {};
    const today = new Date();
    todayFormatted.formattedDate =
      (today.getMonth() + 1).toString().padStart(2, '0') +
      '/' +
      today.getDate().toString().padStart(2, '0') +
      '/' +
      today.getFullYear();
    today.setUTCMinutes(today.getMinutes() - minutes);
    todayFormatted.formattedTime = today.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
    });

    cy.do([
      Button({ text: 'Change due date' }).click(),
      TextField({ name: 'date' }).fillIn(todayFormatted.formattedDate),
      TextField({ name: 'time' }).fillIn(todayFormatted.formattedTime),
      Button({ text: 'Save and close' }).click(),
      Button({ text: 'Close' }).click(),
    ]);
  },

  checkOutItemWithUserName(userName, itemBarcode) {
    addPatron(userName);
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(Button({ id: 'clickable-find-patron' }).click());
    cy.expect(KeyValue('Borrower').exists());
    cy.wait('@getLoans');
    cy.intercept('/circulation/requests?*').as('getRequests');
    cy.do(TextField({ name: 'item.barcode' }).fillIn(itemBarcode));
    cy.wait('@getRequests');
    cy.wait(2000);
    cy.do(Button({ id: 'clickable-add-item' }).click());
    // waiters needs for check out item in loop
    cy.wait(1000);
  },

  closeForDeliveryRequestModal: () => {
    cy.do(modalForDeliveryRequest.find(Checkbox('Print slip')).click());
    cy.do(modalForDeliveryRequest.find(Button('Close and check out')).click());
  },

  openFeeFineLink: (value, userId) => {
    cy.do(
      KeyValue({ value: including(value) })
        .find(Link({ href: including(`/users/${userId}/accounts/open`) }))
        .click(),
    );
  },
  feeFineLinkIsNotClickable: (value, userId) => {
    cy.expect(
      KeyValue({ value: including(value) })
        .find(Link({ href: including(`/users/${userId}/accounts/open`) }))
        .absent(),
    );
  },
  checkDetailsOfCheckOUTAreCleared: () => {
    cy.expect(
      Pane({ id: 'item-details' })
        .find(HTML(including('No items have been entered yet')))
        .exists(),
    );
  },
  checkUserNote: ({ title, details }) => {
    cy.expect(
      Modal({ id: 'popup-note-modal' })
        .find(HTML(including(`Title: ${title}`)))
        .exists(),
    );
    cy.expect(
      Modal({ id: 'popup-note-modal' })
        .find(HTML(including(details)))
        .exists(),
    );
  },
  deleteNote: () => {
    cy.do(Button('Delete note').click());
  },
};
