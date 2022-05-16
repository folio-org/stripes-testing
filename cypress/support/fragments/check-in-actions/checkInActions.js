import uuid from 'uuid';
import { Button, Pane, including, TextField, MultiColumnListCell } from '../../../../interactors';
import NewInctanceHoldingsItem from '../inventory/newInctanceHoldingsItem';
import NewUser from '../user/newUser';
import { REQUEST_METHOD } from '../../constants';

const loadDetailsButton = Button('Loan details');
const patronDetailsButton = Button('Patron details');
const itemDetailsButton = Button('Item details');
const newFeeFineButton = Button('New Fee/Fine');

export default {
  checkInItem: () => {
    cy.do(Button('Check in').click());
    cy.do(TextField({ id: 'input-item-barcode' }).fillIn(NewInctanceHoldingsItem.itemBarcode));
    cy.do(Button({ id: 'clickable-add-item' }).click());
    cy.expect(MultiColumnListCell('Available').exists());
    cy.do(Button({ id: 'available-actions-button-0' }).click());
  },
  existsFormColomns:() => {
    cy.expect([
      loadDetailsButton.exists(),
      patronDetailsButton.exists(),
      itemDetailsButton.exists(),
      newFeeFineButton.exists(),
    ]);
  },
  returnCheckIn() {
    cy.do(Button('Check in').click());
    cy.do(Button({ id: 'available-actions-button-0' }).click());
  },
  existsItemsInForm() {
    cy.do(loadDetailsButton.click());
    cy.expect(Pane(including(NewUser.userName)).exists());
    this.returnCheckIn();
    cy.do(patronDetailsButton.click());
    cy.expect(Pane({ title: NewUser.userName }).exists());
    this.returnCheckIn();
    cy.do(itemDetailsButton.click());
    cy.expect(Pane(including(NewInctanceHoldingsItem.itemBarcode)).exists());
    this.returnCheckIn();
    cy.do(newFeeFineButton.click());
    cy.expect(Pane({ title:  'New fee/fine' }).exists());
    this.returnCheckIn();
  },
  createItemCheckinApi(body) {
    return cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'circulation/check-in-by-barcode',
      body: {
        id: uuid(),
        ...body,
      },
    });
  },
};
