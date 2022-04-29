import { MultiColumnListRow, HTML, including, Button } from '../../../../../interactors';

export default {
  selectLoan:(barcode) => {
    cy.do(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).click());
  },
  declareLoanLost:() => {
    cy.do(Button({ icon:'ellipsis' }).click());
    cy.expect(Button('Declare lost').exists());
    cy.do(Button('Declare lost').click());
  },
  openItemRecordInInventory:(barcode) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).exists());
    cy.do(Button({ icon:'ellipsis' }).click());
    cy.expect(Button('Item details').exists());
    cy.do(Button('Item details').click());
  },
  renewItem:(barcode) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).exists());
    cy.do(Button({ icon:'ellipsis' }).click());
    cy.expect(Button('Renew').exists());
    cy.do(Button('Renew').click());
  }
};
