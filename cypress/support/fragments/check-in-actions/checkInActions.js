import uuid from 'uuid';
import { Button, Pane, including, TextField, MultiColumnListRow, HTML } from '../../../../interactors';
import NewInctanceHoldingsItem from '../inventory/newInctanceHoldingsItem';
import NewUser from '../users/userDefaultObjects/newUser';
import { REQUEST_METHOD } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';

const actionsButton = Button({ id: 'available-actions-button-0' });
const loanDetailsButton = Button('Loan details');
const patronDetailsButton = Button('Patron details');
const itemDetailsButton = Button('Item details');
const newFeeFineButton = Button('New Fee/Fine');
const checkInButton = Button('Check in');
const itemBarcodeField = TextField({ name:'item.barcode' });
const addItemButton = Button({ id: 'clickable-add-item' });
const availableActionsButton = Button({ id: 'available-actions-button-0' });

export default {
  waitLoading:() => {
    cy.expect(itemBarcodeField.exists());
    cy.expect(Button('End session').exists());
  },

  checkInItem:(barcode) => {
    cy.intercept('/inventory/items?*').as('getItems');
    cy.do(itemBarcodeField.fillIn(barcode));
    cy.do(addItemButton.click());
    cy.wait('@getItems', getLongDelay());
  },
  checkInItemGui:(barcode) => {
    cy.do(itemBarcodeField.fillIn(barcode));
    cy.do(addItemButton.click());
  },
  openItemRecordInInventory:(status) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(status))).exists());
    cy.do(availableActionsButton.click());
    cy.expect(itemDetailsButton.exists());
    cy.intercept('/tags?*').as('getTags');
    cy.do(itemDetailsButton.click());
    cy.wait('@getTags', getLongDelay());
  },
  checkActionsMenuOptions:() => {
    cy.expect(actionsButton.exists());
    cy.do(actionsButton.click());
    cy.expect([
      loanDetailsButton.exists(),
      patronDetailsButton.exists(),
      itemDetailsButton.exists(),
      newFeeFineButton.exists(),
    ]);
  },
  returnCheckIn() {
    cy.do(checkInButton.click());
    cy.do(availableActionsButton.click());
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
