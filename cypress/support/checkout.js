import {
  Button,
  Modal,
  MultiColumnList,
  Pane,
  TextField,
} from '../../interactors';

Cypress.Commands.add('checkOutItem', (userBarcode, itemBarcode) => {
  cy.do([
    TextField('Patron identifier').fillIn(userBarcode),
    Pane('Scan patron card').find(Button('Enter')).click(),

    Button(userBarcode).exists(),

    TextField('Item ID').fillIn(itemBarcode),
    Pane('Scan items').find(Button('Enter')).click(),

    Modal('Confirm multipiece check out').find(Button('Check out')).click(),
  ]);
});

Cypress.Commands.add('verifyItemCheckOut', () => {
  // There is a lot of preparation stuff to do to check this
  cy.expect(MultiColumnList({ id: 'list-items-checked-out' }).exists());
});
