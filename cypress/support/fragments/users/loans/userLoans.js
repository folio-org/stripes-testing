import { MultiColumnListRow, HTML, including, Button } from '../../../../../interactors';
import ItemVeiw from '../../inventory/inventoryItem/itemVeiw';

const declaredLostButton = Button('Declare lost');
const itemDetailsButton = Button('Item details');
const renewButton = Button('Renew');
const ellipsisButton = Button({ icon:'ellipsis' });
const rowInList = MultiColumnListRow({ indexRow: 'row-0' });

export default {
  selectLoan:(barcode) => {
    cy.do(rowInList.find(HTML(including(barcode))).click());
  },
  declareLoanLost:() => {
    cy.do(ellipsisButton.click());
    cy.expect(declaredLostButton.exists());
    cy.do(declaredLostButton.click());
  },
  openItemRecordInInventory:(barcode) => {
    cy.expect(rowInList.find(HTML(including(barcode))).exists());
    cy.do(ellipsisButton.click());
    cy.expect(itemDetailsButton.exists());
    cy.do(itemDetailsButton.click());
    ItemVeiw.waitLoading();
  },
  renewItem:(barcode) => {
    cy.expect(rowInList.find(HTML(including(barcode))).exists());
    cy.do(ellipsisButton.click());
    cy.expect(renewButton.exists());
    cy.do(renewButton.click());
  }
};
