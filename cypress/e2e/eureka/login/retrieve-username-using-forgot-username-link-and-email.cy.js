import localforage from 'localforage';
import ForgotPasswordOrUsername from '../../../support/fragments/login/forgotPasswordOrUsername';
import Login from '../../../support/fragments/login/login';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Login', () => {
    const testData = {
      // the address has to be unique: the default test users share one
      email: `at_c1574454_${getRandomLetters(8)}@example.com`,
    };
    const accountLocatedEmailSubject = 'Folio account located';

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([], 'staff', 'staff', true, testData.email).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete user', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1574454 User can retrieve username using "Forgot username?" link and email address (eureka)',
      { tags: ['smoke', 'eureka', 'C1574454'] },
      () => {
        // Precondition: the user is logged out and on the "Log in" page
        // The app restores the session saved in the browser by the previous run and, with no
        // cookies, fails ("Sorry, there was an error during initialization") - cy.login clears it too
        localforage.removeItem('okapiSess');
        cy.logoutViaApi();
        cy.wait(3000);
        cy.clearCookies({ domain: null });
        cy.visit('/');

        // Step 1: Click "Forgot username?"; the page opens, "Continue" is disabled
        Login.openForgotUsername();
        ForgotPasswordOrUsername.waitLoadingForgotUsername();
        ForgotPasswordOrUsername.verifyContinueButtonDisabled();

        // Step 2: Enter the email of the user, click "Continue"; "Check your email" page
        ForgotPasswordOrUsername.fillUsernameEmailOrPhone(testData.email);
        ForgotPasswordOrUsername.clickContinue();
        ForgotPasswordOrUsername.verifyCheckYourEmailPage(testData.email);

        // Step 3: The mailbox - "Folio account located" email with the username of the user
        // (the sent emails are read from mod-email instead of a real mailbox)
        cy.getAdminToken(false);
        cy.waitForSentEmailApi(testData.email, accountLocatedEmailSubject).then((email) => {
          // the wording around the username differs between the envs, so only the username is checked
          expect(email.body).to.include(testData.user.username);
        });
      },
    );
  });
});
