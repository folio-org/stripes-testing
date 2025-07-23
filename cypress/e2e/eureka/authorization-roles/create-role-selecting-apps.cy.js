import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C430260_UserRole_${getRandomPostfix()}`,
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

      const capabilityCallRegExp = new RegExp(
        `\\/capabilities\\?limit=\\d{1,}&query=applicationId==\\(${testData.firstApplicationName}-.{1,}or.{1,}${testData.secondApplicationName}-.{1,}\\)`,
      );

      const capabSetsToAssign = [
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Authorization-Roles Settings Admin',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Capabilities',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Role-Capability-Sets',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
      ];

      before('Create user, data', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      after('Delete user, data', () => {
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
});
