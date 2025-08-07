import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';
import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const testData = {
        roleName: `AT_C627248_UserRole_${getRandomPostfix()}`,
      };

      const capabSetsToAssign = [CapabilitySets.uiAuthorizationRolesUsersSettingsManage];

      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.getUserGroups().then(() => {
          testData.groupAName = Cypress.env('userGroups')[0].group;
          testData.groupBName = Cypress.env('userGroups')[1].group;
          cy.createTempUser([]).then((createdUserProperties) => {
            testData.tempUser = createdUserProperties;
            cy.assignCapabilitiesToExistingUser(
              testData.tempUser.userId,
              capabsToAssign,
              capabSetsToAssign,
            );
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
            cy.createTempUser([], testData.groupAName).then((createdUserAProperties) => {
              testData.userA = createdUserAProperties;
              cy.createTempUser([], testData.groupBName).then((createdUserBProperties) => {
                testData.userB = createdUserBProperties;
                cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
                  testData.roleId = role.id;
                  if (Cypress.env('runAsAdmin')) {
                    cy.updateRolesForUserApi(testData.userA.userId, [testData.roleId]);
                    cy.updateRolesForUserApi(testData.userB.userId, [testData.roleId]);
                  } else {
                    cy.addRolesToNewUserApi(testData.userA.userId, [testData.roleId]);
                    cy.addRolesToNewUserApi(testData.userB.userId, [testData.roleId]);
                  }
                  cy.login(testData.tempUser.username, testData.tempUser.password, {
                    path: TopMenu.settingsAuthorizationRoles,
                    waiter: AuthorizationRoles.waitContentLoading,
                  });
                });
              });
            });
          });
        });
      });

      after('Delete roles, users', () => {
        cy.getAdminToken();
        cy.deleteAuthorizationRoleApi(testData.roleId);
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        Users.deleteViaApi(testData.tempUser.userId);
      });

      it(
        'C627248 [UIROLES-125] Viewing authorization role with user assigned by user with users.settings Manage (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C627248'] },
        () => {
          const usersCallRegExp = new RegExp(
            `\\/roles\\/users\\?.+query=roleId==${testData.roleId}`,
          );
          AuthorizationRoles.searchRole(testData.roleName);
          cy.intercept(usersCallRegExp).as('users');
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.verifyAssignedUser(
            testData.userA.lastName,
            testData.userA.firstName,
            true,
            testData.groupAName,
          );
          AuthorizationRoles.verifyAssignedUser(
            testData.userB.lastName,
            testData.userB.firstName,
            true,
            testData.groupBName,
          );
          cy.wait('@users').then((call) => {
            expect(call.response.statusCode).to.eq(200);
            expect(call.response.body.userRoles).to.have.lengthOf(2);
          });
        },
      );
    });
  });
});
