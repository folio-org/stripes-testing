import {
  Button,
  Modal,
  MultiColumnList,
  TextField,
} from '../../interactors';

Cypress.Commands.add('checkOutItem', (userBarcode, itemBarcode) => {
  cy.do([
    TextField({ id: 'input-patron-identifier' }).fillIn(userBarcode),
    Button({ id: 'clickable-find-patron' }).click(),

    Button(userBarcode).exists(),

    TextField({ id: 'input-item-barcode' }).fillIn(itemBarcode),
    Button({ id: 'clickable-add-item' }).click(),

    Modal('Confirm multipiece check out').find(Button('Check out')).click(),
  ]);
});

Cypress.Commands.add('verifyItemCheckOut', () => {
  cy.expect(MultiColumnList({ id: 'list-items-checked-out' }).exists());
});
