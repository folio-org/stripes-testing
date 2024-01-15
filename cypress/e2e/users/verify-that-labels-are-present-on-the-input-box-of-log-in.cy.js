import Login from '../../support/fragments/login/login';
import ForgotPasswordOrUsername from '../../support/fragments/login/forgotPasswordOrUsername';

describe('Users', () => {
  it(
    'C409509 Verify that labels are present on the input box of log in (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      cy.visit('/');
      Login.openForgotPassword();
      ForgotPasswordOrUsername.waitLoadingForgotPassword();

      cy.visit('/');
      Login.openForgotUsername();
      ForgotPasswordOrUsername.waitLoadingForgotUsername();
    },
  );
});
