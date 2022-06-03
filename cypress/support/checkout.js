import {
  Button,
  Modal,
  MultiColumnList,
  Pane,
  TextField,
} from '../../interactors';

// DEPRECATED use cypress\support\fragments\check-out-actions\check-out-actions.js
Cypress.Commands.add('checkOutItem', (userBarcode, itemBarcode) => {
  cy.do([
    TextField('Patron identifier').fillIn(userBarcode),
    Pane('Scan patron card').find(Button('Enter')).click(),
  ]);
  // wait form to load
  cy.wait(1000);
  cy.do([
    TextField('Item ID').fillIn(itemBarcode),
    Pane('Scan items').find(Button({ id: 'clickable-add-item' })).click(),
    Modal('Confirm multipiece check out').find(Button('Check out')).click(),
  ]);
});

Cypress.Commands.add('verifyItemCheckOut', () => {
  // There is a lot of preparation stuff to do to check this
  cy.expect(MultiColumnList({ id: 'list-items-checked-out' }).exists());
});
