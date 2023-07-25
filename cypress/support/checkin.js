import { Button, Modal, MultiColumnList, TextField } from '../../interactors';

Cypress.Commands.add('checkInItem', (barcode) => {
  cy.do([
    TextField('Item ID').fillIn(barcode),
    Button('Enter').click(),
    Modal('Confirm multipiece check in').find(Button('Check in')).click(),
    Button('End session').click(),
  ]);
});

Cypress.Commands.add('checkIn', (barcode) => {
  cy.do([
    TextField('Item ID').fillIn(barcode),
    Button('Enter').click(),
  ]);
});

Cypress.Commands.add('checkInMultipleItem', (barcode) => {
  cy.do([
    TextField('Item ID').fillIn(barcode),
    Button('Enter').click(),
    Modal('Confirm multipiece check in').find(Button('Check in')).click(),
  ]);
});

Cypress.Commands.add('checkInMultipleItemNotExist', (barcode) => {
  cy.do([
    TextField('Item ID').fillIn(barcode),
    Button('Enter').click(),
    cy.expect(Button('Check in').absent()),
  ]);
});

Cypress.Commands.add('cancelCheckInMultipleItem', (barcode) => {
  cy.do([
    TextField('Item ID').fillIn(barcode),
    Button('Enter').click(),
    Button('Cancel').click(),
  ]);
});

Cypress.Commands.add('verifyItemCheckIn', () => {
  cy.expect(MultiColumnList({ id: 'list-items-checked-in' }).exists());
});
