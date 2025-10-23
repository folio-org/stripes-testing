import { HTML, including } from '../../../../interactors';

export default {
  waitLoadingForgotPassword: () => {
    cy.expect([
      HTML(including('Forgot password?')).exists(),
      HTML(including('Enter email or phone')).exists(),
    ]);
  },

  waitLoadingForgotUsername: () => {
    cy.expect([
      HTML(including('Forgot username?')).exists(),
      HTML(including('Enter email or phone')).exists(),
    ]);
  },
};
