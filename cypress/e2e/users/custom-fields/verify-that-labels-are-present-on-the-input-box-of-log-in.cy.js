import Login from '../../../support/fragments/login/login';
import ForgotPasswordOrUsername from '../../../support/fragments/login/forgotPasswordOrUsername';

describe('Users', () => {
  describe('Custom Fields (Users)', () => {
    it(
      'C409509 Verify that labels are present on the input box of log in (volaris)',
      { tags: ['extendedPath', 'volaris', 'C409509', 'eurekaPhase1'] },
      () => {
        cy.clearCookies({ domain: null }).then(() => {
          cy.visit('/');
          Login.openForgotPassword();
          ForgotPasswordOrUsername.waitLoadingForgotPassword();

          cy.visit('/');
          Login.openForgotUsername();
          ForgotPasswordOrUsername.waitLoadingForgotUsername();
        });
      },
    );
  });
});
