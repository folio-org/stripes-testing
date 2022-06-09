import uuid from 'uuid';
import { Button, Pane, including, TextField, MultiColumnListRow, HTML } from '../../../../interactors';
import NewInctanceHoldingsItem from '../inventory/newInctanceHoldingsItem';
import NewUser from '../user/newUser';
import { REQUEST_METHOD } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';
import ItemVeiw from '../inventory/inventoryItem/itemVeiw';

const loadDetailsButton = Button('Loan details');
const patronDetailsButton = Button('Patron details');
const itemDetailsButton = Button('Item details');
const newFeeFineButton = Button('New Fee/Fine');
const checkInButton = Button('Check in');
const itemBarcodeField = TextField({ name:'item.barcode' });
const addItemButton = Button({ id: 'clickable-add-item' });
const availableActionsButton = Button({ id: 'available-actions-button-0' });

const waitLoading = () => {
  cy.expect(TextField({ name: 'item.barcode' }).exists());
  cy.expect(Button('End session').exists());
};

export default {
  waitLoading,

  checkInItem:(barcode) => {
    waitLoading();
    cy.intercept('/inventory/items?*').as('getItems');
    cy.do(itemBarcodeField.fillIn(barcode));
    cy.do(addItemButton.click());
    cy.wait('@getItems', getLongDelay());
  },

  openItemRecordInInventory:(barcode) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).exists());
    cy.do(availableActionsButton.click());
    cy.expect(itemDetailsButton.exists());
    cy.intercept('/tags?*').as('getTags');
    cy.do(itemDetailsButton.click());
    cy.wait('@getTags', getLongDelay());
    ItemVeiw.waitLoading();
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
    cy.do(availableActionsButton.click());
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
