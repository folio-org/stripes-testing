import { Pane, Modal, TextField, Button, KeyValue, Link, PaneContent, MultiColumnList, Label, MultiColumnListCell } from '../../../../interactors';

const userPane = PaneContent({ id: 'patron-details-content' });
export default {
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
      Modal('Confirm multipiece check out').find(Button('Check out')).click(),
    ]);
  },
  checkItemInfo(itemBarcode, instanceTitle) {
    cy.expect([
      MultiColumnList({ rowCount: 1 }).find(MultiColumnListCell('1')).exists(),
      MultiColumnList({ rowCount: 1 }).find(MultiColumnListCell(itemBarcode)).exists(),
      MultiColumnList({ rowCount: 1 }).find(MultiColumnListCell(instanceTitle)).exists(),
      MultiColumnList({ rowCount: 1 }).find(MultiColumnListCell('Example Loan Policy')).exists(),
      Label('Total items scanned: 1').exists(),
    ]);
  },
  endSession() {
    cy.do([
      Button('End session').click(),
    ]);
  }
};
