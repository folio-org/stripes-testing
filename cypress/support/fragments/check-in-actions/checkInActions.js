import { Button, TextField, MultiColumnListCell } from '../../../../interactors';
import NewInctanceHoldingsItem from '../inventory/newInctanceHoldingsItem';

export default {

  checkInItem: () => {
    cy.do(Button('Check in').click());
    cy.do(TextField({ id: 'input-item-barcode' }).fillIn(NewInctanceHoldingsItem.itemBarcode));
    cy.do(Button({ id: 'clickable-add-item' }).click());
    cy.expect(MultiColumnListCell('Available').exists());
    cy.do(Button({ id: 'available-actions-button-0' }).click());
  },
  returnCheckIn: () => {
    cy.do(Button('Check in').click());
    cy.do(Button({ id: 'available-actions-button-0' }).click());
  }
};
