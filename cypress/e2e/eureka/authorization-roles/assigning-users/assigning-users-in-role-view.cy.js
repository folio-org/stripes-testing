import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';
import UsersCard from '../../../../support/fragments/users/usersCard';
import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const testData = {
        roleAName: `AT_C627249_UserRole_A_${getRandomPostfix()}`,
        roleBName: `AT_C627249_UserRole_B_${getRandomPostfix()}`,
        filtername: 'Status',
        optionName: 'Active',
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
        CapabilitySets.uiUsersRolesView,
      ];

      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.getUserGroups().then(() => {
          testData.groupAName = Cypress.env('userGroups')[1].group;
          testData.groupBName = Cypress.env('userGroups')[0].group;
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
                cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
                  testData.roleAId = role.id;
                });
                cy.createAuthorizationRoleApi(testData.roleBName).then((role) => {
                  testData.roleBId = role.id;
                  if (Cypress.env('runAsAdmin')) cy.deleteRolesForUserApi(testData.userA.userId);
                  if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userB.userId, [testData.roleBId]);
                  else cy.addRolesToNewUserApi(testData.userB.userId, [testData.roleBId]);
                  cy.login(testData.tempUser.username, testData.tempUser.password, {
                    path: TopMenu.settingsAuthorizationRoles,
                    waiter: AuthorizationRoles.waitContentLoading,
                    suthRefresh: true,
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
        'C627249 [UIROLES-125] Assigning user to an authorization role which does not have users assigned while having users.settings Manage (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C627249'] },
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
          cy.wait('@usersPost').its('response.statusCode').should('eq', 201);
          cy.wait('@usersPut').its('response.statusCode').should('eq', 204);
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

          AuthorizationRoles.clickOnAssignedUserName(
            testData.userB.lastName,
            testData.userB.firstName,
          );
          UsersCard.verifyUserCardOpened();
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.verifyUserRoleNames([testData.roleAName, testData.roleBName]);
        },
      );
    });
  });
});
