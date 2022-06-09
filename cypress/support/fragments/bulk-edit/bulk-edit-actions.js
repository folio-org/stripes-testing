import { Button, HTML } from '@interactors/html';

export default {
  openStartBulkEditForm() {
    cy.do([
      Button('Actions').click(),
      Button('Start bulk edit (CSV)').click()
    ]);
  },

  verifyLabel(text) {
    cy.expect(HTML(text).exists());
  },
};
