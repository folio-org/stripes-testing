import localforage from 'localforage';
import { Heading, including } from '../../../../interactors';
import ForgotPasswordOrUsername from '../../../support/fragments/login/forgotPasswordOrUsername';
import Login from '../../../support/fragments/login/login';
import ResetPassword from '../../../support/fragments/login/resetPassword';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Login', () => {
    const testData = {
      // the address has to be unique: the default test users share one
      email: `at_c1574453_${getRandomLetters(8)}@example.com`,
      // satisfies the default password rules: length, upper and lower case, number, special character
      newPassword: `Pw!${getRandomLetters(5)}${getRandomLetters(4).toUpperCase()}9`,
    };
    const resetEmailSubject = 'Reset your FOLIO account password';
    const passwordChangedEmailSubject = 'Your Folio password changed';

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
      'C1574453 User can reset password using "Forgot password?" link and email address (eureka)',
      { tags: ['smoke', 'eureka', 'C1574453'] },
      () => {
        // Precondition: the user is logged out and on the "Log in" page
        // The app restores the session saved in the browser by the previous run and, with no
        // cookies, fails ("Sorry, there was an error during initialization") - cy.login clears it too
        localforage.removeItem('okapiSess');
        cy.logoutViaApi();
        cy.wait(3000);
        cy.clearCookies({ domain: null });
        cy.visit('/');

        // Step 1: Click "Forgot password?"; the page opens, "Continue" is disabled
        Login.openForgotPassword();
        ForgotPasswordOrUsername.waitLoadingForgotPassword();
        ForgotPasswordOrUsername.verifyContinueButtonDisabled();

        // Step 2: Enter the email of the user, click "Continue"; "Check your email" page
        ForgotPasswordOrUsername.fillUsernameEmailOrPhone(testData.email);
        ForgotPasswordOrUsername.clickContinue();
        ForgotPasswordOrUsername.verifyCheckYourEmailPage(testData.email);

        // Step 3: The mailbox - the email is received, "Reset your password" is a link
        // (the sent emails are read from mod-email instead of a real mailbox)
        cy.getAdminToken(false);
        cy.waitForSentEmailApi(testData.email, resetEmailSubject).then((email) => {
          testData.resetLink = ResetPassword.getLinkFromEmailBody(
            email.body,
            'Reset your password',
          );
        });

        // Step 4: Open the link from the email; "Choose a password" page, "Set password" disabled
        cy.then(() => {
          cy.clearCookies({ domain: null });
          ResetPassword.openLinkFromEmail(testData.resetLink);
        });
        ResetPassword.waitLoadingChoosePassword();

        // Step 5: Enter a new valid password in both fields, click "Set password"
        ResetPassword.fillNewPassword(testData.newPassword);
        ResetPassword.clickSetPassword();
        ResetPassword.verifyPasswordChanged();

        // Step 6: The mailbox - "Your Folio password changed" with the first name and date and time
        cy.getAdminToken(false);
        cy.waitForSentEmailApi(testData.email, passwordChangedEmailSubject).then((email) => {
          const sentDate = new Date(email.date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          });

          // any whitespace: the server can put a non-breaking space before AM/PM
          const dateAndTime = new RegExp(
            `changed\\s+on\\s+${sentDate.replace(/ /g, '\\s+')}\\s+at\\s+\\d{1,2}:\\d{2}\\s*(AM|PM)`,
          );

          expect(email.body).to.include(`Dear ${testData.user.firstName}`);
          expect(email.body).to.match(dateAndTime);
        });

        // Step 7: Click "Continue to FOLIO", log in with the username and the new password
        cy.clearCookies({ domain: null });
        ResetPassword.clickContinueToFolio();
        cy.inputCredentialsAndLogin(testData.user.username, testData.newPassword);
        cy.expect(Heading(including('Welcome')).exists());
      },
    );
  });
});
