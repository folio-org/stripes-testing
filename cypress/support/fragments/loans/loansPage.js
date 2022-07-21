import { Button, Pane } from '../../../../interactors';

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
  closePage() {
    cy.do(Pane({ id: 'pane-loanshistory' }).find(Button({ ariaLabel: 'Close ' })).click());
  },
  checkLoanPolicy(policyName) {
    cy.contains(policyName).should('be.visible');
  },

};
