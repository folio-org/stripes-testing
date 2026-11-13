import localforage from 'localforage';
import { Heading, including } from '../../../../interactors';
import ForgotPasswordOrUsername from '../../../support/fragments/login/forgotPasswordOrUsername';
import Login from '../../../support/fragments/login/login';
import ResetPassword from '../../../support/fragments/login/resetPassword';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    const resetEmailSubject = 'Reset your FOLIO account password';
    const defaultLinkExpiration = { unitOfTime: 'hours', time: 24 };
    const testData = {
      // the address has to be unique to find the emails sent to it
      email: `at_c1602580_${getRandomLetters(8)}@example.com`,
      newPassword: `Pw!${getRandomLetters(5)}${getRandomLetters(4).toUpperCase()}9`,
    };

    before('Create user', () => {
      cy.getAdminToken();
      // The user with a password who can log in
      cy.createTempUser([], 'staff', 'staff', true, testData.email).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Reset the link expiration, delete user', () => {
      // the expiration is a tenant-wide setting: set to the default value, not to the previous one;
      // the call is made outside of the browser session, so it doesn't depend on the UI cookies
      cy.setPasswordResetLinkExpirationApi(
        defaultLinkExpiration.unitOfTime,
        defaultLinkExpiration.time,
      );
      // the app of the logged in user can still make requests which change the session cookies
      cy.wait(2000);
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1602580 User can set a new password through "request a new link" in the forgotten-password email (eureka)',
      { tags: ['extendedPath', 'eureka', 'nonParallel', 'C1602580'] },
      () => {
        // Precondition: the link expires in 1 minute (tenant-wide setting, reset in after())
        cy.setPasswordResetLinkExpirationApi('minutes', 1);

        // Precondition: no user is logged in, the login page is open
        // The app restores the session saved in the browser by the previous run and, with no
        // cookies, fails ("Sorry, there was an error during initialization") - cy.login clears it too
        localforage.removeItem('okapiSess');
        cy.logoutViaApi();
        cy.wait(3000);
        cy.clearCookies({ domain: null });
        cy.visit('/');

        // Step 1: Click "Forgot password?"; the page opens with the username field and "Continue"
        Login.openForgotPassword();
        ForgotPasswordOrUsername.waitLoadingForgotPassword();
        ForgotPasswordOrUsername.verifyContinueButtonDisabled();

        // Step 2: Enter the username, click "Continue"; "Check your email" page
        ForgotPasswordOrUsername.fillUsernameEmailOrPhone(testData.user.username);
        ForgotPasswordOrUsername.clickContinue();
        ForgotPasswordOrUsername.verifyCheckYourEmailPage();

        // Step 3: The mailbox - "Reset your FOLIO account password" email, "request a new link" is
        // a link (the sent emails are read from mod-email instead of a real mailbox)
        cy.getAdminToken(false);
        cy.waitForSentEmailApi(testData.email, resetEmailSubject).then((email) => {
          testData.requestNewLink = ResetPassword.getLinkFromEmailBody(
            email.body,
            'request a new link',
          );
        });

        // Step 4: Wait for at least 1 minute (the link expires), click "request a new link" in the
        // email; the "Forgot password?" page opens
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(61_000);
        cy.getAdminToken(false);
        // The expiration is set back to the default so the link of the next email doesn't expire
        // while the pages are loading (the browser is slower than the case "Immediately" assumes)
        cy.setPasswordResetLinkExpirationApi(
          defaultLinkExpiration.unitOfTime,
          defaultLinkExpiration.time,
        );
        cy.then(() => {
          cy.clearCookies({ domain: null });
          ResetPassword.openLinkFromEmail(testData.requestNewLink);
        });
        cy.url().should('include', '/forgot-password');
        ForgotPasswordOrUsername.waitLoadingForgotPassword();

        // Step 5: Enter the username, click "Continue"; "Check your email" page
        ForgotPasswordOrUsername.fillUsernameEmailOrPhone(testData.user.username);
        ForgotPasswordOrUsername.clickContinue();
        ForgotPasswordOrUsername.verifyCheckYourEmailPage();

        // Step 6: The newly received "Reset your FOLIO account password" email, the link inside
        // (it is "Reset your password" in the email, "Set your password" in the case);
        // "Choose a password" page with two empty fields and "Set password" disabled
        cy.getAdminToken(false);
        cy.waitForSentEmailApi(testData.email, resetEmailSubject, { minCount: 2 }).then((email) => {
          testData.setPasswordLink = ResetPassword.getLinkFromEmailBody(
            email.body,
            'Reset your password',
          );
        });
        cy.then(() => {
          cy.clearCookies({ domain: null });
          ResetPassword.openLinkFromEmail(testData.setPasswordLink);
        });
        ResetPassword.waitLoadingChoosePassword();

        // Step 7: Enter a valid password in both fields, click "Set password"
        ResetPassword.fillNewPassword(testData.newPassword);
        ResetPassword.clickSetPassword();
        ResetPassword.verifyPasswordChanged();

        // Step 8: Click "Continue to FOLIO", log in with the new password
        cy.clearCookies({ domain: null });
        ResetPassword.clickContinueToFolio();
        cy.inputCredentialsAndLogin(testData.user.username, testData.newPassword);
        cy.expect(Heading(including('Welcome')).exists());
      },
    );
  });
});
