import { Button } from '../../../../interactors';

export default {
  openChangeDueDateForm() {
    cy.do([
      Button({ icon: 'ellipsis' }).click(),
      Button('Change due date').click()
    ]);
  }
};
