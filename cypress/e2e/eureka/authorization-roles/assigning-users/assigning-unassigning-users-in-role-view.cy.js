import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const testData = {
        roleName: `Auto Role A C442837 ${getRandomPostfix()}`,
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
          testData.groupAName = Cypress.env('userGroups')[2].group;
          testData.groupBName = Cypress.env('userGroups')[0].group;
          testData.groupBName = Cypress.env('userGroups')[1].group;
          cy.createTempUser([]).then((createdUserProperties) => {
            testData.tempUser = createdUserProperties;
            cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsToAssign);
            cy.updateRolesForUserApi(testData.tempUser.userId, []);
            cy.createTempUser([], testData.groupAName).then((createdUserAProperties) => {
              testData.userA = createdUserAProperties;
              cy.createTempUser([], testData.groupBName).then((createdUserBProperties) => {
                testData.userB = createdUserBProperties;
                cy.createTempUser([], testData.groupCName).then((createdUserCProperties) => {
                  testData.userC = createdUserCProperties;
                  cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
                    testData.roleId = role.id;
                    cy.updateRolesForUserApi(testData.userA.userId, [testData.roleId]);
                    cy.updateRolesForUserApi(testData.userB.userId, []);
                    cy.updateRolesForUserApi(testData.userC.userId, []);
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
      });

      after('Delete roles, users', () => {
        cy.getAdminToken();
        cy.deleteAuthorizationRoleApi(testData.roleId);
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
        Users.deleteViaApi(testData.userC.userId);
        Users.deleteViaApi(testData.tempUser.userId);
      });

      it(
        'C442837 Assigning/unassigning users for an existing authorization role (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
        () => {
          cy.reload();
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.checkUsersAccordion(1);
          AuthorizationRoles.verifyAssignedUser(
            testData.userA.lastName,
            testData.userA.firstName,
            true,
            testData.groupAName,
          );
          AuthorizationRoles.clickAssignUsersButton();
          cy.wait(3000);
          AuthorizationRoles.selectFilterOptionInAssignModal(
            testData.filtername,
            testData.optionName,
            true,
            true,
          );
          AuthorizationRoles.clickResetAllInAssignModal();
          AuthorizationRoles.selectUserInModal(testData.userA.username, false);
          AuthorizationRoles.selectUserInModal(testData.userB.username);
          AuthorizationRoles.selectUserInModal(testData.userC.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.checkUsersAccordion(2);
          AuthorizationRoles.verifyAssignedUser(
            testData.userB.lastName,
            testData.userB.firstName,
            true,
            testData.groupBName,
          );
          AuthorizationRoles.verifyAssignedUser(
            testData.userC.lastName,
            testData.userC.firstName,
            true,
            testData.groupCName,
          );
          AuthorizationRoles.closeRoleDetailView(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.checkUsersAccordion(2);
          AuthorizationRoles.verifyAssignedUser(
            testData.userB.lastName,
            testData.userB.firstName,
            true,
            testData.groupBName,
          );
          AuthorizationRoles.verifyAssignedUser(
            testData.userC.lastName,
            testData.userC.firstName,
            true,
            testData.groupCName,
          );
          AuthorizationRoles.clickAssignUsersButton();
          cy.wait(3000);
          AuthorizationRoles.selectUserInModal(testData.userB.username, false);
          AuthorizationRoles.selectUserInModal(testData.userC.username, false);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        },
      );
    });
  });
});
