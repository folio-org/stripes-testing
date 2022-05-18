import { TextField, Button, KeyValue, Pane } from '../../../../interactors';

const expectedStatus = 'Active';

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

  checkPatronInformation:(userName, userBarcode) => {
    const borrower = KeyValue('Borrower');
    const barcode = KeyValue('Barcode');
    const status = KeyValue('Status');

    //cy.expect(Pane('Scan patron card').find(borrower).has({ value: userName }));
    cy.expect(barcode.has({ value: userBarcode }));
    cy.expect(status.has({ value: expectedStatus }));
  }
};
