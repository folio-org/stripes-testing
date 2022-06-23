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
  HTML,
  including,
  PaneContent
} from '../../../../interactors';

const modal = Modal('Confirm multipiece check out');

const userPane = PaneContent({ id: 'patron-details-content' });
export default {
  modal,
  checkOutUser(userBarcode) {
    cy.do([
      TextField('Patron identifier').fillIn(userBarcode),
      Pane('Scan patron card').find(Button('Enter')).click(),
      Button(userBarcode).exists(),
    ]);
  },

  checkUserInfo(user, patronGroup = '0') {
    cy.expect([
      userPane.find(KeyValue({ value: 'Active' })).exists(),
      userPane.find(KeyValue({ value: patronGroup })).exists(),
      userPane.find(Link(`${user.personal.lastName}, `)).exists(),
      userPane.find(Link(user.barcode)).exists(),
    ]);
  },

  checkOutItem(itemBarcode) {
    cy.do([
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

  endSession() {
    cy.do([
      Button('End session').click(),
    ]);
  },

  checkOutItemUser(userBarcode, itemBarcode) {
    cy.do(TextField({ name: 'patron.identifier' }).fillIn(userBarcode));
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.do(Button({ id: 'clickable-find-patron' }).click());
    cy.expect(KeyValue('Borrower').exists());
    cy.wait('@getLoans');
    cy.intercept('/circulation/requests?*').as('getRequests');
    cy.do(TextField({ name: 'item.barcode' }).fillIn(itemBarcode));
    cy.wait('@getRequests');
    cy.do(Button({ id: 'clickable-add-item' }).click());
    // waiters needs for check out item in loop
    cy.wait(1000);
  },

  endCheckOutSession:() => {
    cy.do(Button('End session').click());
  },

  checkIsInterfacesOpened:() => {
    cy.expect(Pane('Scan patron card').exists());
    cy.expect(Pane('Scan items').exists());
  },

  checkPatronInformation:() => {
    cy.expect(KeyValue('Borrower').exists());
    cy.expect(KeyValue('Status').exists());
  },

  checkItem:(barcode) => {
    cy.expect(MultiColumnList({ id:'list-items-checked-out' }).find(HTML(including(barcode))).absent());
  }
};
