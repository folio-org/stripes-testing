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
const endSessionButton = Button('End session');
const userPane = PaneContent({ id: 'patron-details-content' });
export default {
  modal,
  checkOutUser(userBarcode, otherParametr) {
    return cy.do([
      TextField('Patron identifier').fillIn(otherParametr || userBarcode),
      Pane('Scan patron card').find(Button('Enter')).click(),
      Button(userBarcode).exists(),
    ]);
  },

  async checkUserInfo({ barcode, personal }, patronGroup = '0') {
    return cy.expect([
      userPane.find(KeyValue({ value: 'Active' })).exists(),
      userPane.find(KeyValue({ value: patronGroup })).exists(),
      userPane.find(Link(including(personal.lastname + ', '))).exists(),
      userPane.find(Link(barcode)).exists(),
    ]);
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
    cy.do(endSessionButton.click());
    cy.expect(endSessionButton.absent());
  },

  endCheckOutSessionAutomatically:() => {
    //this timeout is needed to wait 60 seconds until the action is automatically done
    cy.intercept('/circulation/end-patron-action-session').as('end-patron-session');
    cy.wait('@end-patron-session', { timeout: 99000 }).then(xhr => {
      cy.wrap(xhr.response.statusCode).should('eq', 204);
    });
    cy.expect(endSessionButton.absent());
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
  },
};
