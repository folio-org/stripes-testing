import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { Heading, including } from '../../../../interactors';

describe('Eureka', () => {
  describe('Login', () => {
    const invalidPassword = 'wrong_password_c1030031';
    const nonExistingUsername = `non_existing_${getRandomPostfix()}`;
    const welcomeHeading = Heading(including('Welcome'));
    const testData = {
      userA: {},
      userB: {},
    };

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        testData.userA = userProperties;
      });
      cy.createTempUser([]).then((userProperties) => {
        testData.userB = userProperties;
        cy.getUsers({ limit: 1, query: `"id"="${userProperties.userId}"` }).then((users) => {
          const user = users[0];
          user.active = false;
          cy.updateUser(user);
        });
      });
      cy.then(() => {
        cy.wait(3000);
        cy.logoutViaApi();
        cy.clearCookies({ domain: null });
        cy.visit('/');
        cy.selectTenantIfDropdown();
      });
    });

    after('Delete users, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
    });

    it(
      'C1030031 Verify error message for unsuccessful login (thunderjet) (eureka)',
      { tags: ['criticalPath', 'eureka', 'thunderjet', 'C1030031'] },
      () => {
        // Step 1: Login as User A with correct credentials; verify name in header
        cy.inputCredentialsAndLogin(testData.userA.username, testData.userA.password);
        cy.expect(welcomeHeading.exists());
        cy.verifyUserNameInProfile(
          testData.userA.personal.lastName,
          testData.userA.personal.firstName,
        );

        // Step 2: Logout and click "Log in again"
        cy.logout();
        cy.clickLoginAgainButton();

        // Step 3: Login as User A with wrong password; verify error message
        cy.selectTenantIfDropdown();
        cy.inputCredentialsAndLogin(testData.userA.username, invalidPassword);
        cy.verifyInvalidCredentialsMessage();
        cy.verifyRestartLoginLinkAbsent();

        // Step 4: Login as inactive User B with correct password; verify disabled account message
        cy.inputCredentialsAndLogin(testData.userB.username, testData.userB.password);
        cy.verifyAccountDisabledMessage();
        cy.verifyRestartLoginLinkAbsent();

        // Step 5: Login as User B with wrong password; verify error message
        cy.inputCredentialsAndLogin(testData.userB.username, invalidPassword);
        cy.verifyInvalidCredentialsMessage();
        cy.verifyRestartLoginLinkAbsent();

        // Step 6: Login with non-existing username; verify error message
        cy.inputCredentialsAndLogin(nonExistingUsername, invalidPassword);
        cy.verifyInvalidCredentialsMessage();
        cy.verifyRestartLoginLinkAbsent();
        cy.verifyInvalidCredentialsMessage();
      },
    );
  });
});
