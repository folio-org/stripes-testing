import { Heading, including } from '../../../../interactors';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import ForgotPasswordOrUsername from '../../../support/fragments/login/forgotPasswordOrUsername';
import ResetPassword from '../../../support/fragments/login/resetPassword';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    const activationEmailSubject = 'Activate your FOLIO account';
    const defaultLinkExpiration = { unitOfTime: 'hours', time: 24 };
    const testData = {
      // the address has to be unique to find the emails sent to it
      email: `at_c1602578_${getRandomLetters(8)}@example.com`,
      newPassword: `Pw!${getRandomLetters(5)}${getRandomLetters(4).toUpperCase()}9`,
    };

    before('Create users', () => {
      cy.getAdminToken();
      // The user who sends the link: capability sets from the preconditions
      cy.createTempUser([]).then((userProperties) => {
        testData.actor = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.actor.userId,
          [],
          [CapabilitySets.uiUsersCreate, CapabilitySets.uiUsersResetPassword],
        );
      });
      // The user with no password: created through Keycloak (cy.createTempUser always sets one)
      cy.getFirstUserGroupId({ limit: 1000 }, 'staff').then((userGroup) => {
        const userBody = { ...Users.generateUserModel(), patronGroup: userGroup.id };

        userBody.personal.email = testData.email;
        Users.createViaApi(userBody, { keycloak: true }).then((user) => {
          testData.user = user;
        });
      });
    });

    after('Reset the link expiration, delete users', () => {
      // the expiration is a tenant-wide setting: set to the default value, not to the previous one;
      // the call is made outside of the browser session, so it doesn't depend on the UI cookies
      cy.setPasswordResetLinkExpirationApi(
        defaultLinkExpiration.unitOfTime,
        defaultLinkExpiration.time,
      );
      // the app of the logged in user can still make requests which change the session cookies
      cy.wait(2000);
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.actor.userId);
      Users.deleteViaApi(testData.user.id);
    });

    it(
      'C1602578 User can set a new password through "request a new link" in the create-password email (eureka)',
      { tags: ['extendedPath', 'eureka', 'nonParallel', 'C1602578'] },
      () => {
        // Precondition: the link expires in 1 minute (tenant-wide setting, reset in after())
        cy.setPasswordResetLinkExpirationApi('minutes', 1);

        // Precondition: the user is on the Users app with the user without a password opened
        cy.then(() => {
          cy.login(testData.actor.username, testData.actor.password, {
            path: TopMenu.usersPath,
            waiter: Users.waitLoading,
            authRefresh: true,
          });
        });
        UsersSearchPane.searchByUsername(testData.user.username);
        UsersSearchPane.selectUserFromList(testData.user.username);

        // Step 1: Actions > Edit, "Send reset password email"; the popup shows the address
        UserEdit.openEdit();
        UserEdit.clickResetPasswordLink();
        UserEdit.verifyResetPasswordEmailSentTo(testData.email);

        // Step 2: Log out of FOLIO
        UserEdit.closeResetPasswordModal();
        cy.logout();

        // Step 3: The mailbox - "Activate your FOLIO account" email, "request a new link" is a link
        // (the sent emails are read from mod-email instead of a real mailbox)
        cy.getAdminToken(false);
        cy.waitForSentEmailApi(testData.email, activationEmailSubject).then((email) => {
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

        // Step 6: The newly received "Activate your FOLIO account" email, "Set your password" link;
        // "Choose a password" page with two empty fields and "Set password" disabled
        cy.getAdminToken(false);
        cy.waitForSentEmailApi(testData.email, activationEmailSubject, { minCount: 2 }).then(
          (email) => {
            testData.setPasswordLink = ResetPassword.getLinkFromEmailBody(
              email.body,
              'Set your password',
            );
          },
        );
        cy.then(() => {
          cy.clearCookies({ domain: null });
          ResetPassword.openLinkFromEmail(testData.setPasswordLink);
        });
        ResetPassword.waitLoadingChoosePassword();

        // Step 7: Enter a new valid password in both fields, click "Set password"
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
