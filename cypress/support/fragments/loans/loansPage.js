import { Button, Pane } from '../../../../interactors';

export default {
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
  closePage() {
    cy.do(Pane({ id: 'pane-loanshistory' }).find(Button({ ariaLabel: 'Close ' })).click());
  },
};
