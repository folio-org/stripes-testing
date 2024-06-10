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
        filtername: 'Status',
        optionName: 'Active',
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
        { type: 'Data', resource: 'Roles Users', action: 'Manage' },
        { type: 'Data', resource: 'Users', action: 'Manage' },
      ];

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.getUserGroups().then(() => {
          testData.groupAName = Cypress.env('userGroups')[1].group;
          testData.groupBName = Cypress.env('userGroups')[0].group;
          cy.createTempUser([]).then((createdUserProperties) => {
            testData.tempUser = createdUserProperties;
            cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsToAssign);
            cy.updateRolesForUserApi(testData.tempUser.userId, []);
            cy.createTempUser([], testData.groupAName).then((createdUserAProperties) => {
              testData.userA = createdUserAProperties;
              cy.createTempUser([], testData.groupBName).then((createdUserBProperties) => {
                testData.userB = createdUserBProperties;
                cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
                  testData.roleAId = role.id;
                });
                cy.createAuthorizationRoleApi(testData.roleBName).then((role) => {
                  testData.roleBId = role.id;
                  // TO DO: rewrite when users will not have admin role assigned upon creation
                  cy.deleteRolesForUserApi(testData.userA.userId);
                  cy.updateRolesForUserApi(testData.userB.userId, [testData.roleBId]);
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
          AuthorizationRoles.clickOnRoleName(testData.roleAName);
          AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
          cy.wait('@usersGet').then((call) => {
            expect(call.response.statusCode).to.eq(200);
            expect(call.response.body.userRoles).to.have.lengthOf(0);
          });
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectFilterOptionInAssignModal(
            testData.filtername,
            testData.optionName,
            true,
            true,
          );
          AuthorizationRoles.clickResetAllInAssignModal();
          AuthorizationRoles.selectUserInModal(testData.userA.username);
          AuthorizationRoles.selectUserInModal(testData.userB.username);
          cy.intercept('POST', '/roles/users').as('usersPost');
          cy.intercept('PUT', '/roles/users/*').as('usersPut');
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.checkUsersAccordion(2);
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
          cy.wait('@usersPost').its('response.statusCode').should('eq', 201);
          cy.wait('@usersPut').its('response.statusCode').should('eq', 204);
        },
      );
    });
  });
});
