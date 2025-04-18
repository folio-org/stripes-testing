import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import DateTools from '../../../support/utils/dateTools';
import { DEFAULT_LOCALE_STRING } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C464307 ${getRandomPostfix()}`,
        updatedRoleName: `Auto Role C464307 ${getRandomPostfix()} UPD`,
        localeConfigName: 'localeSettings',
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before(() => {
        cy.getAdminToken();
        // set default locale settings for tenant (with UTC)
        cy.getConfigForTenantByName(testData.localeConfigName).then((config) => {
          if (config) {
            const updatedConfig = { ...config };
            updatedConfig.value = DEFAULT_LOCALE_STRING;
            cy.updateConfigForTenantById(config.id, updatedConfig);
          }
        });
        cy.createTempUser([]).then((createdUserAProperties) => {
          testData.userA = createdUserAProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.userA.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);
          cy.createTempUser([]).then((createdUserBProperties) => {
            testData.userB = createdUserBProperties;
            cy.assignCapabilitiesToExistingUser(
              testData.userB.userId,
              capabsToAssign,
              capabSetsToAssign,
            );
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userB.userId, []);

            cy.login(testData.userA.username, testData.userA.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C464307 "General Information" accordion is properly populated when creating/updating a role (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C464307'] },
        () => {
          let createdDateTime;
          let updatedDateTime;
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          cy.intercept('POST', '/roles*').as('createCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@createCall').then((call) => {
            testData.roleId = call.response.body.id;
            createdDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);
            AuthorizationRoles.checkRoleFound(testData.roleName);
            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName);
            AuthorizationRoles.verifyGeneralInformationWhenCollapsed(createdDateTime);
            AuthorizationRoles.verifyGeneralInformationWhenExpanded(
              createdDateTime,
              `${testData.userA.lastName}, ${testData.userA.firstName}`,
              createdDateTime,
              `${testData.userA.lastName}, ${testData.userA.firstName}`,
            );
            cy.logout();
            cy.login(testData.userB.username, testData.userB.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
            AuthorizationRoles.waitLoading();
            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName);
            AuthorizationRoles.verifyGeneralInformationWhenCollapsed(createdDateTime);
            AuthorizationRoles.openForEdit();
            AuthorizationRoles.fillRoleNameDescription(testData.updatedRoleName);
            cy.intercept('PUT', '/roles/*').as('updateCall');
            AuthorizationRoles.clickSaveButton();
            cy.wait('@updateCall').then(() => {
              updatedDateTime = DateTools.getFormattedEndDateWithTimUTC(new Date(), true);
              AuthorizationRoles.verifyRoleViewPane(testData.updatedRoleName);
              AuthorizationRoles.verifyGeneralInformationWhenCollapsed(updatedDateTime);
              AuthorizationRoles.verifyGeneralInformationWhenExpanded(
                updatedDateTime,
                `${testData.userB.lastName}, ${testData.userB.firstName}`,
                createdDateTime,
                `${testData.userA.lastName}, ${testData.userA.firstName}`,
              );
            });
          });
        },
      );
    });
  });
});
