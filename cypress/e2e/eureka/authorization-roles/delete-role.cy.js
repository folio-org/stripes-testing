import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `Auto Role C624296 ${getRandomPostfix()}`,
        roleDescription: `Description C624296 ${getRandomPostfix()}`,
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi(testData.roleName, testData.roleDescription).then(
            (role) => {
              testData.roleId = role.id;
              cy.getCapabilitiesApi(10).then((capabs) => {
                cy.getCapabilitySetsApi(3).then((capabSets) => {
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
            },
          );
        });
      });

      after('Delete role, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C624296 Delete a role with capabilities and users assigned (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C624296'] },
        () => {
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkCapabilitiesAccordionCounter(/^[1-9]\d*$/, true);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('3');
          AuthorizationRoles.checkUsersAccordion(1);
          AuthorizationRoles.clickDeleteRole();
          AuthorizationRoles.cancelDeleteRole(testData.roleName);
          AuthorizationRoles.clickDeleteRole();
          AuthorizationRoles.confirmDeleteRole(testData.roleName);
        },
      );
    });
  });
});
