import { HTML, TextField, including } from '../../../../interactors';

export default {
  waitLoadingForgotPassword: () => {
    cy.expect([
      HTML(including('Forgot password?')).exists(),
      HTML(including('Enter your email, username or phone number')).exists(),
      TextField({ placeholder: 'Enter email or phone' }).exists(),
    ]);
  },

  waitLoadingForgotUsername: () => {
    cy.expect([
      HTML(including('Forgot username?')).exists(),
      HTML(including('Enter your email or phone number')).exists(),
      TextField({ placeholder: 'Enter email or phone' }).exists(),
    ]);
  },
};
