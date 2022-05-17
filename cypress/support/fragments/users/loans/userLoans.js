import { MultiColumnListRow, HTML, including, Button } from '../../../../../interactors';

const declaredLostButton = Button('Declare lost');
const itemDetailsButton = Button('Item details');
const renewButton = Button('Renew');

export default {
  selectLoan:(barcode) => {
    cy.do(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).click());
  },
  declareLoanLost:() => {
    cy.do(Button({ icon:'ellipsis' }).click());
    cy.expect(declaredLostButton.exists());
    cy.do(declaredLostButton.click());
  },
  openItemRecordInInventory:(barcode) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).exists());
    cy.do(Button({ icon:'ellipsis' }).click());
    cy.expect(itemDetailsButton.exists());
    cy.do(itemDetailsButton.click());
  },
  renewItem:(barcode) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).exists());
    cy.do(Button({ icon:'ellipsis' }).click());
    cy.expect(renewButton.exists());
    cy.do(renewButton.click());
  }
};
