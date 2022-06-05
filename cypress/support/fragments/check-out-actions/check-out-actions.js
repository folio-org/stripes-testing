import TopMenu from '../topMenu';
import { Pane, Modal, TextField, Button } from '../../../../interactors';

export default {
  checkOutItem(itemBarcode) {
    cy.do([
      TextField({ name: 'item.barcode' }).fillIn(itemBarcode),
      Pane('Scan items').find(Button({ id: 'clickable-add-item' })).click(),
      Modal('Confirm multipiece check out').find(Button('Check out')).click()
    ]);
  },
  checkOutUser(userBarcode) {
    cy.visit(TopMenu.checkOutPath);
    cy.do([
      TextField({ name: 'patron.identifier' }).fillIn(userBarcode),
      Pane('Scan patron card').find(Button('Enter')).click(),
    ]);
  },
  endSession() {
    cy.do([
      Button('End session').click(),
    ]);
  },
};
