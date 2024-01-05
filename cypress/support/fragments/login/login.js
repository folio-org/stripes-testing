import { Link } from '../../../../interactors';

export default {
  openForgotPassword() {
    cy.do(Link('Forgot password?').click());
  },

  openForgotUsername() {
    cy.do(Link('Forgot username?').click());
  },
};
