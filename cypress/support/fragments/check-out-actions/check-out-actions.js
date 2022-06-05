import { Pane, Modal, TextField, Button } from '../../../../interactors';

export default {
  checkOutItem(userBarcode, itemBarcode) {
    cy.do([
      TextField('Patron identifier').fillIn(userBarcode),
      Pane('Scan patron card').find(Button('Enter')).click(),

      Button(userBarcode).exists(),

      TextField('Item ID').fillIn(itemBarcode),
      Pane('Scan items').find(Button('Enter')).click(),

      Modal('Confirm multipiece check out').find(Button('Check out')).click(),
    ]);
  },
  endSession() {
    cy.do([
      Button('End session').click(),
    ]);
  },
};
