import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const testData = {
        roleAName: `Auto Role A C442836 ${getRandomPostfix()}`,
        roleBName: `Auto Role B C442836 ${getRandomPostfix()}`,
      };

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.getUserGroups().then(() => {
          testData.groupADescr = Cypress.env('userGroups')[1].desc;
          testData.groupBDescr = Cypress.env('userGroups')[0].desc;
          testData.groupAName = Cypress.env('userGroups')[1].group;
          testData.groupBName = Cypress.env('userGroups')[0].group;
          cy.createTempUser([]).then((createdUserProperties) => {
            testData.tempUser = createdUserProperties;
            cy.createTempUser([], testData.groupAName).then((createdUserAProperties) => {
              testData.userA = createdUserAProperties;
              cy.createTempUser([], testData.groupBName).then((createdUserBProperties) => {
                testData.userB = createdUserBProperties;
                cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
                  testData.roleAId = role.id;
                  // TO DO: rewrite when users will not have admin role assigned upon creation
                  cy.deleteRolesForUserApi(testData.userA.userId);
                  cy.updateRolesForUserApi(testData.userB.userId, [testData.roleId]);
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
        cy.deleteAuthorizationRoleApi(testData.roleAId);
        cy.deleteAuthorizationRoleApi(testData.roleBId);
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        Users.deleteViaApi(testData.tempUser.userId);
      });

      it(
        'C442836 Assigning user to an authorization role which does not have users assigned (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
        () => {
          const usersCallRegExpGet = new RegExp(
            `\\/roles\\/users\\?.+query=roleId==${testData.roleAId}`,
          );

          AuthorizationRoles.searchRole(testData.roleAName);
          cy.intercept(usersCallRegExpGet).as('usersGet');
          cy.intercept('POST', '/roles/users**').as('usersPost');
          cy.intercept('PUT', '/roles/users**').as('usersPut');
          AuthorizationRoles.clickOnRoleName(testData.roleAName);
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.verifyAssignedUser(
            testData.userA.lastName,
            testData.userA.firstName,
            true,
            testData.groupADescr,
          );
          AuthorizationRoles.verifyAssignedUser(
            testData.userB.lastName,
            testData.userB.firstName,
            true,
            testData.groupBDescr,
          );
          cy.wait('@users').then((call) => {
            expect(call.response.statusCode).to.eq(200);
            expect(call.response.body.userRoles).to.have.lengthOf(2);
          });

          cy.wait('@usersPost').its('response.statusCode').should('eq', 201);
          cy.wait('@usersPut').its('response.statusCode').should('eq', 204);
        },
      );
    });
  });
});
