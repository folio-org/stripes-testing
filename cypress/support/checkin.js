import {
  Button,
  Checkbox,
  Modal,
  MultiColumnList,
  TextField,
} from '../../interactors';

Cypress.Commands.add('checkInItem', barcode => {
  cy.do([
    TextField('Item ID').fillIn(barcode),
    Button('Enter').click(),
    Modal('Confirm multipiece check in').find(Button('Check in')).click(),
    Checkbox('Print slip').click(),
    Button('Close').click(),
  ]);
});

Cypress.Commands.add('verifyItemCheckIn', () => {
  // There is a lot of preparation stuff to do to check this
  cy.expect(MultiColumnList({ id: 'list-items-checked-in' }).exists());
});
