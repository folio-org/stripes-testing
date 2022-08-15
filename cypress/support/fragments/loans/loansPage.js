import { Button, Pane } from '../../../../interactors';
import ConfirmItemStatusModal from '../users/loans/confirmItemStatusModal';

export default {
  exportLoansToCSV() {
    cy.do(Button('Export to CSV').click());
  },
  openChangeDueDateForm() {
    cy.do([
      Button({ icon: 'ellipsis' }).click(),
      Button('Change due date').click(),
    ]);
  },
  claimReturnedAndConfirm() {
    this.claimReturned();
    ConfirmItemStatusModal.confirmItemStatus();
  },
  claimReturnedAndCancel() {
    cy.do(Button('Claim returned').click());
  },
  renewLoan() {
    cy.do([
      Button({ icon: 'ellipsis' }).click(),
      Button('Renew').click(),
    ]);
  },
  renewalMessageCheck(message) {
    this.renewLoan();
    cy.contains(message).should('be.visible');
  },
  checkOverrideButtonHidden() {
    cy.expect(Button('Override').absent());
  },
  checkOverrideButtonVisible() {
    cy.expect(Button('Override').exists());
  },
  closePage() {
    cy.do(Pane({ id: 'pane-loanshistory' }).find(Button({ ariaLabel: 'Close ' })).click());
  },
  checkLoanPolicy(policyName) {
    cy.contains(policyName).should('be.visible');
  },
  verifyExportFileName(actualName) {
    const expectedFileNameMask = /export\.csv/gm;//
    expect(actualName).to.match(expectedFileNameMask);
  },
  verifyContentOfExportFileName(actual, ...expectedArray) {
    expectedArray.forEach(expectedItem => (expect(actual).to.include(expectedItem)));
  }
};
