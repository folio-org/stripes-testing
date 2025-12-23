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
  RadioButton,
  MultiColumnListRow,
} from '../../../../interactors';
import SelectUser from './selectUser';

const modal = Modal('Confirm multipiece check out');
const endSessionButton = Button('End session');
const userPane = PaneContent({ id: 'patron-details-content' });
const modalForDeliveryRequest = Modal('Route for delivery request');
const noteModal = Modal({ id: 'popup-note-modal' });
const actionsButton = Button({ id: 'available-item-actions-button' });
const checkOutNotesButton = Button('Check out notes');

function addPatron(userName) {
  cy.do(Button({ id: 'patronLookup' }).click());
  SelectUser.searchUser(userName);
  SelectUser.selectUserFromList(userName);
}

export default {
  modal,
  addPatron,

  waitForPatronSpinnerToDisappear() {
    cy.wait(1000);
    cy.get('#patron-details-content [class^="spinner"]').should('not.exist');
    cy.wait(500);
  },

  waitForItemSpinnerToDisappear() {
    cy.wait(3000);
    cy.get('#item-details-content [class^="spinner"]').should('not.exist');
    cy.wait(500);
  },

  checkOutUser(userBarcode, otherParameter) {
    cy.do([
      TextField('Patron identifier').fillIn(otherParameter || userBarcode),
      Pane('Scan patron card').find(Button('Enter')).click(),
      Button(userBarcode).exists(),
    ]);
    this.waitForPatronSpinnerToDisappear();
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
    cy.do(TextField('Item ID').fillIn(itemBarcode));
    cy.wait(1000);
    cy.do(Pane('Scan items').find(Button('Enter')).click());
    this.waitForItemSpinnerToDisappear();
  },

  closeItemsAwaitingPickupModal() {
    cy.wait(1000);
    cy.do(Modal('Items awaiting pickup').find(Button('Close')).click());
    cy.wait(1000);
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
    // cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(Button({ id: 'clickable-find-patron' }).click());
    this.waitForPatronSpinnerToDisappear();
    cy.expect(KeyValue('Borrower').exists());
    // cy.wait('@getLoans');
    // need to wait until data to loaded
    cy.wait(1500);
    cy.do(TextField({ name: 'item.barcode' }).fillIn(itemBarcode));
    cy.wait(500);
    cy.do(Button({ id: 'clickable-add-item' }).click());
    this.waitForItemSpinnerToDisappear();
  },

  endCheckOutSession: () => {
    cy.intercept('POST', '**/circulation/end-patron-action-session').as('endPatronActionSession');
    cy.do(endSessionButton.click());
    cy.wait('@endPatronActionSession');
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

  verifyItemCheckedOut(itemBarcode) {
    const trimmedBarcode = itemBarcode.trim();
    cy.expect(
      MultiColumnList({ id: 'list-items-checked-out' })
        .find(HTML(including(trimmedBarcode)))
        .exists(),
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
    cy.wait(500);
    cy.do(modal.find(Button('Cancel')).click());
    cy.expect(modal.absent());
  },

  openLoanDetails() {
    cy.do(actionsButton.click());
    cy.wait(500);
    cy.do(Button('Loan details').click());
    cy.wait(500);
    cy.expect(Pane({ id: 'pane-loandetails' }).exists());
  },

  openCheckOutNotes() {
    cy.wait(500);
    cy.do(actionsButton.click());
    cy.wait(500);
    cy.expect(checkOutNotesButton.exists());
    cy.do(checkOutNotesButton.click());
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
    // cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(Button({ id: 'clickable-find-patron' }).click());
    this.waitForPatronSpinnerToDisappear();
    cy.expect(KeyValue('Borrower').exists());
    // cy.wait('@getLoans');
    // cy.intercept('/circulation/requests?*').as('getRequests');
    cy.do(TextField({ name: 'item.barcode' }).fillIn(itemBarcode));
    // cy.wait('@getRequests');
    cy.wait(2000);
    cy.do(Button({ id: 'clickable-add-item' }).click());
    this.waitForItemSpinnerToDisappear();
    // waiters needs for check out item in loop
    // cy.wait(1000);
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
    cy.wait(1000);
  },
  closeNote: () => {
    cy.do(Button('Close').click());
    cy.wait(1000);
  },
  checkNoteModalNotDisplayed: () => {
    cy.expect(noteModal.absent());
  },
  chooseActingPatron: (patron) => {
    cy.expect(Modal('Who are you acting as?').exists());
    cy.do([RadioButton(including(patron)).click(), Button('Continue').click()]);
  },
  checkItemIsNotCheckedOut(itemBarcode) {
    cy.expect([
      MultiColumnListRow(including(itemBarcode)).absent(),
      HTML(including('No items have been entered yet')),
    ]);
  },
  clickOnUserBarcodeLink: (barcode) => {
    cy.do(Link(barcode).click());
  },

  checkLoanPolicyInLoanDetails(loanPolicyId) {
    cy.expect(KeyValue('Loan policy').find(Link(loanPolicyId)).exists());
  },
  checkOverdueFinePolicyInLoanDetails(overdueFinePolicyId) {
    cy.expect(KeyValue('Overdue fine policy').find(Link(overdueFinePolicyId)).exists());
  },
  checkLostItemFeePolicyInLoanDetails(lostItemFeePolicyId) {
    cy.expect(KeyValue('Lost item fee policy').find(Link(lostItemFeePolicyId)).exists());
  },

  verifyFeeFinesOwed(amount) {
    cy.expect(KeyValue({ value: including(amount) }).exists());
  },

  waitLoading() {
    cy.expect(Pane('Scan patron card').exists());
    cy.expect(Pane('Scan items').exists());
  },
};
