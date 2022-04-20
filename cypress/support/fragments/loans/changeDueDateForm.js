import { HTML } from '@interactors/html';
import { Button, TextField } from '../../../../interactors';

export default {
  fillDate(dateString) {
    // dateString format MM/DD/YYYY
    cy.do(TextField('Date').fillIn(dateString));
    // wait is necessary because TextField fill very quickly
    cy.wait(1000);
  },
  verifyWarning(textString) {
    cy.expect(HTML(textString).exists());
  },
  saveAndClose() {
    cy.do([
      Button('Save and close').click(),
      Button('Close').click()
    ]);
  }
};
