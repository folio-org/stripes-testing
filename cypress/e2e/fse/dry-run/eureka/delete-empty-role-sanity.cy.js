import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const { user, memberTenant } = parseSanityParameters();

      const testData = {
        roleName: `AT_C446119_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description C446119 ${getRandomPostfix()}`,
      };

      before('Create role, user', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();

        cy.createAuthorizationRoleApi(testData.roleName, testData.roleDescription).then((role) => {
          testData.roleId = role.id;
          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
            authRefresh: true,
          });
          cy.allure().logCommandSteps();
        });
      });

      after('Delete role, user', () => {
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C446119 Delete a role without capabilities and users (eureka)',
        { tags: ['dryRun', 'eureka', 'C446119'] },
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
