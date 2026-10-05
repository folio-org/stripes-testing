import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const { user, memberTenant } = parseSanityParameters();

      const testData = {
        roleName: `AT_C446120_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description C446120 ${getRandomPostfix()}`,
      };

      before('Create role, user', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.userA = createdUserProperties;

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
                    cy.addRolesToNewUserApi(testData.userA.userId, [roleId]);
                  });
                });
              });
              cy.allure().logCommandSteps(false);
              cy.login(user.username, user.password, {
                path: TopMenu.settingsAuthorizationRoles,
                waiter: AuthorizationRoles.waitContentLoading,
                authRefresh: true,
              });
              cy.allure().logCommandSteps();
            },
          );
        });
      });

      after('Delete role, user', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        Users.deleteViaApi(testData.userA.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C446120 Delete a role with capabilities and users assigned (eureka)',
        { tags: ['dryRun', 'eureka', 'C446120'] },
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
