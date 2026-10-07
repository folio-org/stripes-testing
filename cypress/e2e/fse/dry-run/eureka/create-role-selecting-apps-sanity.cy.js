import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../../support/constants';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

let testData;
let capabilityCallRegExp;
let user;
let memberTenant;

describe(
  'Eureka',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Settings', () => {
      describe('Authorization roles', () => {
        beforeEach(() => {
          ({ user, memberTenant } = parseSanityParameters());

          testData = {
            roleName: `Auto Role C430260 ${getRandomPostfix()}`,
            roleDescription: `Description C430260 ${getRandomPostfix()}`,
            firstApplicationName: 'app-licenses',
            secondApplicationName: 'app-acquisitions',
            capabilities: [
              {
                table: CAPABILITY_TYPES.DATA,
                resource: 'Finance',
                action: CAPABILITY_ACTIONS.MANAGE,
              },
              {
                table: CAPABILITY_TYPES.SETTINGS,
                resource: 'Module Claims Enabled',
                action: CAPABILITY_ACTIONS.VIEW,
              },
              {
                table: CAPABILITY_TYPES.DATA,
                resource: 'Licenses Files',
                action: CAPABILITY_ACTIONS.VIEW,
              },
              {
                table: CAPABILITY_TYPES.PROCEDURAL,
                resource: 'Licenses Admin Action',
                action: CAPABILITY_ACTIONS.EXECUTE,
              },
              {
                table: CAPABILITY_TYPES.PROCEDURAL,
                resource: 'Invoice Item Pay',
                action: CAPABILITY_ACTIONS.EXECUTE,
              },
            ],
            expectedCounts: {
              capabilities: {
                Data: 2,
                Settings: 1,
                Procedural: 2,
              },
            },
          };

          // Lookaheads (order-independent) instead of a fixed first-then-second sequence, since
          // the API call may list the two applications in either order. Also avoids matching
          // literal "==", "(", ")" - the real request URL sends these percent-encoded
          // (e.g. "%3D%3D", "%28", "%29"), not as literal characters
          capabilityCallRegExp = new RegExp(
            `\\/capabilities\\?limit=\\d{1,}.*(?=.*${testData.firstApplicationName}-)(?=.*${testData.secondApplicationName}-)`,
          );

          cy.setTenant(memberTenant.id);
          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
            authRefresh: true,
          });
          cy.allure().logCommandSteps();
        });

        afterEach(() => {
          cy.allure().logCommandSteps(false);
          cy.getUserToken(user.username, user.password, { log: false });
          cy.allure().logCommandSteps();
          cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
            cy.deleteAuthorizationRoleApi(roleId);
          });
        });

        it(
          'C430260 Selecting applications when creating new authorization role (eureka)',
          { tags: ['dryRun', 'eureka', 'C430260'] },
          () => {
            AuthorizationRoles.clickNewButton();
            AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
            AuthorizationRoles.checkSaveButton(true);
            AuthorizationRoles.clickSelectApplication();
            AuthorizationRoles.selectApplicationInModal(testData.firstApplicationName);
            AuthorizationRoles.selectApplicationInModal(testData.secondApplicationName);
            cy.wait(1000);
            cy.intercept('GET', capabilityCallRegExp).as('capabilities');
            AuthorizationRoles.clickSaveInModal();
            AuthorizationRoles.waitCapabilitiesShown();
            cy.wait('@capabilities').its('response.statusCode').should('eq', 200);
            AuthorizationRoles.verifyAppNamesInCapabilityTables([
              testData.firstApplicationName,
              testData.secondApplicationName,
            ]);
            testData.capabilities.forEach((capability) => {
              AuthorizationRoles.selectCapabilityCheckbox(capability);
            });
            cy.wait(1000);
            AuthorizationRoles.clickSaveButton();
            AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName);
            AuthorizationRoles.clickOnCapabilitySetsAccordion(false);
            AuthorizationRoles.clickOnCapabilitiesAccordion();
            AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
            testData.capabilities.forEach((capability) => {
              AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
            });
            Object.entries(testData.expectedCounts.capabilities).forEach(([table, count]) => {
              AuthorizationRoles.checkCountOfCapabilityRows(table, count);
            });
          },
        );
      });
    });
  },
);
