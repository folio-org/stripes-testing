import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

const testData = {
  roleName: `AT_C430260_UserRole_${getRandomPostfix()}`,
  roleDescription: `Description C430260 ${getRandomPostfix()}`,
  firstApplicationName: 'app-licenses',
  secondApplicationName: 'app-acquisitions',
  capabilities: [
    {
      table: CAPABILITY_TYPES.DATA,
      resource: 'UI-Finance Fiscal-Year',
      action: CAPABILITY_ACTIONS.CREATE,
    },
    {
      table: CAPABILITY_TYPES.SETTINGS,
      resource: 'UI-Finance Settings',
      action: CAPABILITY_ACTIONS.VIEW,
    },
    {
      table: CAPABILITY_TYPES.DATA,
      resource: 'UI-Licenses Licenses',
      action: CAPABILITY_ACTIONS.VIEW,
    },
    {
      table: CAPABILITY_TYPES.PROCEDURAL,
      resource: 'UI-Licenses Licenses File',
      action: CAPABILITY_ACTIONS.EXECUTE,
    },
    {
      table: CAPABILITY_TYPES.PROCEDURAL,
      resource: 'UI-Receiving',
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

const capabilityCallRegExp = new RegExp(
  `\\/capabilities\\?limit=\\d{1,}&query=applicationId==\\(${testData.firstApplicationName}-.{1,}or.{1,}${testData.secondApplicationName}-.{1,}\\)`,
);

const capabSetsToAssign = [
  CapabilitySets.uiAuthorizationRolesSettingsAdmin,
  CapabilitySets.capabilities,
  CapabilitySets.roleCapabilitySets,
];

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
        beforeEach('Create user, data', () => {
          cy.createTempUser([]).then((createdUserProperties) => {
            testData.user = createdUserProperties;
            cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.settingsAuthorizationRoles,
                waiter: AuthorizationRoles.waitContentLoading,
              });
            }, 20_000);
          });
        });

        afterEach('Delete user, data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
            if (roleId) cy.deleteAuthorizationRoleApi(roleId);
          });
        });

        it(
          'C430260 Selecting applications when creating new authorization role (eureka)',
          { tags: ['smoke', 'eureka', 'eurekaPhase1', 'C430260'] },
          () => {
            AuthorizationRoles.clickNewButton();
            AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
            AuthorizationRoles.checkSaveButton(true);
            AuthorizationRoles.clickSelectApplication();
            AuthorizationRoles.selectApplicationInModal(testData.firstApplicationName);
            AuthorizationRoles.selectApplicationInModal(testData.secondApplicationName);
            cy.wait(1000);
            cy.intercept('GET', '/capabilities?*').as('capabilities');
            AuthorizationRoles.clickSaveInModal();
            AuthorizationRoles.waitCapabilitiesShown();
            cy.wait('@capabilities').then(({ request, response }) => {
              const url = decodeURIComponent(request.url);
              expect(url).to.match(capabilityCallRegExp);
              expect(response.statusCode).to.eq(200);
            });
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
