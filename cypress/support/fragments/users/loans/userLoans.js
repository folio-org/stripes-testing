import { matching } from 'bigtest';
import { Pane, MultiColumnListRow, MultiColumnListCell, HTML, including, Button, KeyValue } from '../../../../../interactors';
import ItemView from '../../inventory/inventoryItem/itemView';

const claimReturnedButton = Button('Claim returned');
const declaredLostButton = Button('Declare lost');
const itemDetailsButton = Button('Item details');
const renewButton = Button('Renew');
const ellipsisButton = Button({ icon:'ellipsis' });
const rowInList = MultiColumnListRow({ indexRow: 'row-0' });

function openActionsMenuOfLoanByBarcode(itemBarcode) {
  cy.do(MultiColumnListRow({ text: matching(itemBarcode), isContainer: false }).find(ellipsisButton).click());
}

export default {
  openClaimReturnedPane() {
    return cy.do(claimReturnedButton.click());
  },
  verifyClaimReturnedButtonIsDisabled() {
    return cy.expect(claimReturnedButton.absent());
  },
  verifyClaimReturnedButtonIsVisible() {
    return cy.expect(claimReturnedButton.exists());
  },
  checkOffLoanByBarcode: (itemBarcode) => {
    //interactors don't allow to find element inside the cell column
    return cy.contains(itemBarcode).parent('*[class^="mclRow--"]').within(() => {
      cy.get('div input[type=checkbox]').click();
    });
  },
  selectLoan:(barcode) => {
    cy.do(rowInList.find(HTML(including(barcode))).click());
  },
  openLoan:(itemBarcode) => {
    return cy.do(MultiColumnListRow({ text: matching(itemBarcode), isContainer: false }).click());
  },
  declareLoanLost:() => {
    cy.do(ellipsisButton.click());
    cy.expect(declaredLostButton.exists());
    return cy.do(declaredLostButton.click());
  },
  openActionsMenuOfLoanByBarcode,
  declareLoanLostByBarcode:(itemBarcode) => {
    openActionsMenuOfLoanByBarcode(itemBarcode);
    return cy.do(declaredLostButton.click());
  },
  openItemRecordInInventory:(barcode) => {
    cy.expect(rowInList.find(HTML(including(barcode))).exists());
    cy.do(ellipsisButton.click());
    cy.expect(itemDetailsButton.exists());
    cy.do(itemDetailsButton.click());
    ItemView.waitLoading();
  },
  renewItem:(barcode, isLoanOpened = false) => {
    if (isLoanOpened) {
      cy.expect(KeyValue({ value: barcode }).exists());
      cy.expect(renewButton.exists());
      cy.do(renewButton.click());
    } else {
      cy.expect(rowInList.find(HTML(including(barcode))).exists());
      cy.do(ellipsisButton.click());
      cy.expect(renewButton.exists());
      cy.do(renewButton.click());
    }
  },
  checkResultsInTheRowByBarcode: (allContentToCheck, itemBarcode) => {
    return allContentToCheck.forEach(contentToCheck => cy.expect(MultiColumnListRow({ text: matching(itemBarcode), isContainer: false }).find(MultiColumnListCell({ content: including(contentToCheck) })).exists()));
  },
  verifyNumberOfLoans: (number) => {
    // verify every string in result table
    for (let i = 0; i < number; i++) {
      cy.expect(MultiColumnListRow({ rowIndexInParent: `row-${i}` }).exists());
    }
  },
  verifyQuantityOpenAndClaimedReturnedLoans: (numberOfOpenLoans, numberOfClaimedReturnedLoans) => {
    return cy.expect(Pane(including('Loans -')).find(HTML(including(`${numberOfOpenLoans} records found (${numberOfClaimedReturnedLoans} claimed returned)`))).exists());
  }

};
