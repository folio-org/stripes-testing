import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C554635_UserRole_${getRandomPostfix()}`,
        calloutText: 'error while duplicating',
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings', action: 'View' },
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings', action: 'Edit' },
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings', action: 'Delete' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
            cy.getCapabilitiesApi(2).then((capabs) => {
              cy.getCapabilitySetsApi(2).then((capabSets) => {
                cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
                  testData.roleId = roleId;
                  cy.addCapabilitiesToNewRoleApi(
                    roleId,
                    capabs.map((capab) => capab.id),
                  );
                  cy.addCapabilitySetsToNewRoleApi(
                    roleId,
                    capabSets.map((capab) => capab.id),
                  );
                  cy.addRolesToNewUserApi(createdUserProperties.userId, [roleId]);
                });
              });
            });
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C554635 Eureka | User with insufficient capabilities can not duplicate an authorization role (thunderjet)',
        { tags: ['extendedPath', 'thunderjet', 'eureka', 'C554635'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName, false);
          AuthorizationRoles.clickActionsButton();
          AuthorizationRoles.checkDuplicateOptionShown(false);
        },
      );
    });
  });
});
