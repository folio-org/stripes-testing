import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { Heading, including } from '../../../../../interactors';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Eureka', () => {
  describe('Login', () => {
    describe('Consortia', () => {
      const invalidPassword = 'wrong_password_c1030032';
      const nonExistingUsername = `non_existing_${getRandomPostfix()}`;
      const welcomeHeading = Heading(including('Welcome'));
      const testData = {
        userA: {},
        userB: {},
        userC: {},
        userD: {},
      };

      before('Create users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.then(() => {
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
        })
          .then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);
            cy.createTempUser([]).then((userProperties) => {
              testData.userC = userProperties;
            });
            cy.createTempUser([]).then((userProperties) => {
              testData.userD = userProperties;
              cy.getUsers({ limit: 1, query: `"id"="${userProperties.userId}"` }).then((users) => {
                const user = users[0];
                user.active = false;
                cy.updateUser(user);
              });
            });
          })
          .then(() => {
            cy.wait(6000);
            cy.logoutViaApi();
            cy.clearCookies({ domain: null });
            cy.resetTenant();
            cy.visit('/');
            cy.selectTenantIfDropdown();
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.userC.userId);
        Users.deleteViaApi(testData.userD.userId);
      });

      // Steps 9-11 will FAIL until https://folio-org.atlassian.net/browse/EUREKA-863 is fixed
      it(
        'C1030032 ECS | Verify error message for unsuccessful login (consortium) (eureka) (thunderjet)',
        { tags: ['criticalPathECS', 'eureka', 'thunderjet', 'C1030032'] },
        () => {
          // Step 1: Login as User A (Central) with correct credentials; verify name in header
          cy.inputCredentialsAndLogin(testData.userA.username, testData.userA.password);
          cy.expect(welcomeHeading.exists());
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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

          // Step 4: Login as inactive User B (Central) with correct password; verify disabled account message
          cy.inputCredentialsAndLogin(testData.userB.username, testData.userB.password);
          cy.verifyAccountDisabledMessage();

          // Step 5: Login as User B with wrong password; verify error message
          cy.inputCredentialsAndLogin(testData.userB.username, invalidPassword);
          cy.verifyInvalidCredentialsMessage();

          // Step 6: Switch to Member tenant; login as User C with correct credentials; verify name in header
          cy.setTenant(Affiliations.College);
          cy.wait(3000);
          cy.logoutViaApi();
          cy.clearCookies({ domain: null });
          cy.visit('/');
          cy.selectTenantIfDropdown();
          cy.inputCredentialsAndLogin(testData.userC.username, testData.userC.password);
          cy.expect(welcomeHeading.exists());
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          cy.verifyUserNameInProfile(
            testData.userC.personal.lastName,
            testData.userC.personal.firstName,
          );

          // Step 7: Logout and click "Log in again"
          cy.logout();
          cy.clickLoginAgainButton();

          // Step 8: Login as User C with wrong password; verify error message
          cy.selectTenantIfDropdown();
          cy.inputCredentialsAndLogin(testData.userC.username, invalidPassword);
          cy.verifyInvalidCredentialsMessage();
          cy.verifyRestartLoginLinkAbsent();

          // Step 9: Login as inactive User D (Member) with correct password; verify disabled account message
          cy.inputCredentialsAndLogin(testData.userD.username, testData.userD.password);
          cy.verifyAccountDisabledMessage();
          cy.verifyRestartLoginLinkAbsent();

          // Step 10: Login as User D with wrong password; verify error message
          cy.inputCredentialsAndLogin(testData.userD.username, invalidPassword);
          cy.verifyInvalidCredentialsMessage();
          cy.verifyRestartLoginLinkAbsent();

          // Step 11: Login with non-existing username; verify error message
          cy.inputCredentialsAndLogin(nonExistingUsername, invalidPassword);
          cy.verifyInvalidCredentialsMessage();
          cy.verifyRestartLoginLinkAbsent();
          cy.verifyInvalidCredentialsMessage();
        },
      );
    });
  });
});
