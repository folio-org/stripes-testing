import TopMenu from '../topMenu';
import { Pane, Modal, TextField, Button, KeyValue, MultiColumnListRow } from '../../../../interactors';

export default {
  checkOutItem(userBarcode, itemBarcode) {
    cy.visit(TopMenu.checkOutPath);
    cy.do([
      TextField({ name: 'patron.identifier' }).fillIn(userBarcode),
      Pane('Scan patron card').find(Button('Enter')).click(),
      // Button({ id: 'clickable-find-patron' }).click(),
    ]);
    cy.expect(KeyValue('Borrower').exists());
    cy.wait(1000)
    cy.do([
      TextField({ name: 'item.barcode' }).fillIn(itemBarcode),
      Button({ id: 'clickable-add-item' }).click(),
    ]);
    cy.do([
      Button('End session').click(),
      Pane('Scan items').find(Button({ id: 'clickable-add-item' })).click(),
      Modal('Confirm multipiece check out').find(Button('Check out')).click()
    ]);
    cy.expect(MultiColumnListRow().exists());
  }
};
