import { HTML, TextField, including } from '../../../../interactors';

export default {
  waitLoadingForgotPassword: () => {
    cy.expect([
      HTML(including('Forgot password?')).exists(),
      TextField({ label: 'Enter username, email or phone' }).exists(),
      TextField({ placeholder: 'Enter username, email or phone' }).exists(),
    ]);
  },

  waitLoadingForgotUsername: () => {
    cy.expect([
      HTML(including('Forgot username?')).exists(),
      TextField({ label: 'Enter email or phone' }).exists(),
      TextField({ placeholder: 'Enter email or phone' }).exists(),
    ]);
  },
};
