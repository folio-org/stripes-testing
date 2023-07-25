import { Button, Modal, MultiColumnList, TextField } from '../../interactors';

Cypress.Commands.add('checkInItem', (barcode) => {
  cy.do([
    TextField('Item ID').fillIn(barcode),
    Button('Enter').click(),
    Modal('Confirm multipiece check in').find(Button('Check in')).click(),
    Button('End session').click(),
  ]);
});

Cypress.Commands.add('verifyItemCheckIn', () => {
  cy.expect(MultiColumnList({ id: 'list-items-checked-in' }).exists());
});
