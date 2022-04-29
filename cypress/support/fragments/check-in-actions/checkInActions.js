import { Button, Pane, including, TextField, MultiColumnListRow, HTML } from '../../../../interactors';
import NewInctanceHoldingsItem from '../inventory/newInctanceHoldingsItem';
import NewUser from '../user/newUser';

const loadDetailsButton = Button('Loan details');
const patronDetailsButton = Button('Patron details');
const itemDetailsButton = Button('Item details');
const newFeeFineButton = Button('New Fee/Fine');
const checkInButton = Button('Check in');
const itemBarcodeField = TextField({ name:'item.barcode' });
const addItemButton = Button({ id: 'clickable-add-item' });

export default {
  checkInItem:(barcode) => {
    cy.do(checkInButton.click());
    cy.intercept('/inventory/items?*').as('getItems');
    cy.do(itemBarcodeField.fillIn(barcode));
    cy.do(addItemButton.click());
    cy.wait('@getItems');
  },
  openItemRecordInInventory:(status) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(status))).exists());
    cy.do(Button({ id: 'available-actions-button-0' }).click());
    cy.intercept('/inventory/items*').as('getItems');
    cy.expect(Button('Item details').exists());
    cy.do(Button('Item details').click());
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
    cy.do(checkInButton.click());
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
};
