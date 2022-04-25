import { Button, Pane } from '../../../../interactors';

export default {
  openChangeDueDateForm() {
    cy.do([
      Button({ icon: 'ellipsis' }).click(),
      Button('Change due date').click()
    ]);
  },
  closePage() {
    cy.do(Pane({ id: 'pane-loanshistory' }).find(Button({ ariaLabel: 'Close ' })).click());
  }
};
