import { Link, HTML } from '../../../../interactors';

export default {
  openForgotPassword() {
    cy.do(Link('Forgot password?').click());
  },

  openForgotUsername() {
    cy.do(Link('Forgot username?').click());
  },

  verifyWelcomeTextExists() {
    cy.expect(HTML({ text: 'Welcome, the Future Of Libraries Is OPEN!' }).exists());
  },
};
