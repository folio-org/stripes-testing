import {
  Button,
  Checkbox,
  MultiColumnList,
  TextField,
} from '../../interactors';

Cypress.Commands.add('checkInItem', barcode => {
  cy.do([
    TextField({ id: 'input-item-barcode' }).fillIn(barcode),
    Button('Enter').click(),
    Button({ text: 'Check in', button: true }).click(),
    Checkbox('Print slip').click(),
    Button('Close').click(),
  ]);
});

Cypress.Commands.add('verifyItemCheckIn', () => {
  cy.expect(MultiColumnList({ id: 'list-items-checked-in' }).exists());
});
