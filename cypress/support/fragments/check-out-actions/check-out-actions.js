import { TextField, Button, KeyValue, Pane } from '../../../../interactors';

export default {
  checkOutItem(userBarcode, itemBarcode) {
    cy.do([
      TextField({ name: 'patron.identifier' }).fillIn(userBarcode),
      Button({ id: 'clickable-find-patron' }).click(),
    ]);
    cy.expect(KeyValue('Borrower').exists());
    cy.do([
      TextField({ name: 'item.barcode' }).fillIn(itemBarcode),
      Button({ id: 'clickable-add-item' }).click(),
    ]);
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
  }
};
