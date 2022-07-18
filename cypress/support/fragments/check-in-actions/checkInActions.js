import uuid from 'uuid';
import { Button, including, TextField, MultiColumnListRow, MultiColumnList, HTML, Pane, Modal } from '../../../../interactors';
import { REQUEST_METHOD } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';
import ItemVeiw from '../inventory/inventoryItem/itemVeiw';

const loanDetailsButton = Button('Loan details');
const patronDetailsButton = Button('Patron details');
const itemDetailsButton = Button('Item details');
const newFeeFineButton = Button('New Fee/Fine');
const checkInButton = Button('Check in');
const itemBarcodeField = TextField({ name:'item.barcode' });
const addItemButton = Button({ id: 'clickable-add-item' });
const availableActionsButton = Button({ id: 'available-actions-button-0' });
const confirmModal = Modal('Confirm multipiece check in');
const checkOutButton = confirmModal.find(Button('Check in'));

const waitLoading = () => {
  cy.expect(TextField({ name: 'item.barcode' }).exists());
  cy.expect(Button('End session').exists());
};

export default {
  waitLoading:() => {
    cy.expect(itemBarcodeField.exists());
    cy.expect(Button('End session').exists());
  },

  checkInItem:(barcode) => {
    waitLoading();
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
    ItemVeiw.waitLoading();
  },
  checkActionsMenuOptions:() => {
    cy.expect(availableActionsButton.exists());
    cy.do(availableActionsButton.click());
    cy.expect([
      loanDetailsButton.exists(),
      patronDetailsButton.exists(),
      itemDetailsButton.exists(),
      newFeeFineButton.exists(),
    ]);
    cy.do(availableActionsButton.click());
  },
  openCheckInPane: () => {
    cy.do(checkInButton.click());
  },
  openLoanDetails: (username) => {
    cy.do([
      availableActionsButton.click(),
      loanDetailsButton.click()
    ]);
    cy.expect(Pane(including(username)).exists());
    cy.expect(Pane(including('Loan details')).exists());
  },
  openPatronDetails: (username) => {
    cy.do([
      availableActionsButton.click(),
      patronDetailsButton.click()
    ]);
    cy.expect(Pane({ title: including(username) }).exists());
  },
  openItemDetails: (itemBarcode) => {
    cy.do([
      availableActionsButton.click(),
      itemDetailsButton.click()
    ]);
    cy.expect(Pane(including(itemBarcode)).exists());
  },
  openNewfeefinesPane: () => {
    cy.do([
      availableActionsButton.click(),
      newFeeFineButton.click()
    ]);
    cy.expect(Modal(including('New fee/fine')).exists());
  },
  createItemCheckinApi: (body) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'circulation/check-in-by-barcode',
      body: {
        id: uuid(),
        ...body,
      },
    });
  },
  confirmMultipleItemsCheckin(barcode) {
    cy.do(checkOutButton.click());
    cy.expect(MultiColumnList({ id:'list-items-checked-in' }).find(HTML(including(barcode))).exists());
  }
};
