import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C446119_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description C446119 ${getRandomPostfix()}`,
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings', action: 'Delete' },
        { type: 'Settings', resource: 'UI-Authorization-Roles Users Settings', action: 'View' },
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
        'C446119 Delete a role without capabilities and users (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C446119'] },
        () => {
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkCapabilitiesAccordionCounter('0');
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
          AuthorizationRoles.checkUsersAccordion();
          AuthorizationRoles.clickDeleteRole();
          AuthorizationRoles.cancelDeleteRole(testData.roleName);
          AuthorizationRoles.clickDeleteRole();
          AuthorizationRoles.confirmDeleteRole(testData.roleName);
        },
      );
    });
  });
});
