import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const testData = {
        roleAName: `Auto Role A C451613 ${getRandomPostfix()}`,
        roleBName: `Auto Role B C451613 ${getRandomPostfix()}`,
        newLastName: `C451613Last${getRandomLetters(6)}`,
        newFirstName: `C451613First${getRandomLetters(6)}`,
        newEmailAddress: `email${getRandomLetters(6)}@.folio.org`,
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
        { type: 'Data', resource: 'Capabilities', action: 'Manage' },
        { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
        { type: 'Data', resource: 'Roles Users', action: 'Manage' },
        { type: 'Data', resource: 'UI-Users', action: 'View' },
        { type: 'Data', resource: 'UI-Users', action: 'Create' },
        { type: 'Data', resource: 'UI-Users', action: 'Edit' },
      ];

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.getUserGroups().then(() => {
          testData.groupAName = Cypress.env('userGroups')[0].group;
          cy.createTempUser([]).then((createdUserProperties) => {
            testData.tempUser = createdUserProperties;
            cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsToAssign);
            cy.updateRolesForUserApi(testData.tempUser.userId, []);
            cy.createTempUser([], testData.groupAName).then((createdUserAProperties) => {
              testData.userA = createdUserAProperties;
              cy.updateRolesForUserApi(testData.userA.userId, []);
              cy.createAuthorizationRoleApi(testData.roleAName).then((roleA) => {
                testData.roleAId = roleA.id;
                cy.createAuthorizationRoleApi(testData.roleBName).then((roleB) => {
                  testData.roleBId = roleB.id;
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
        Users.deleteViaApi(testData.tempUser.userId);
      });

      it(
        'C451613 Assigning/unassigning a user for a role after username changed (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleAName);
          AuthorizationRoles.clickOnRoleName(testData.roleAName);
          AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.userA.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.verifyAssignedUsersAccordion();
          AuthorizationRoles.checkUsersAccordion(1);
          AuthorizationRoles.verifyAssignedUser(
            testData.userA.lastName,
            testData.userA.firstName,
            true,
            testData.groupAName,
          );

          cy.visit(TopMenu.usersPath);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(testData.userA.username);
          UsersSearchPane.selectUserFromList(testData.userA.username);
          UsersCard.verifyUserRolesCounter('0');
          UserEdit.openEdit();
          UsersCard.verifyUserRolesCounter('0');
          UserEdit.editUsername(testData.newUsername);
          UserEdit.fillLastFirstNames(testData.newFirstName, testData.newLastName);
          UserEdit.fillEmailAddress(testData.newEmailAddress);

          // AuthorizationRoles.checkUsersAccordion(1);
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.userA.lastName,
          //   testData.userA.firstName,
          //   true,
          //   testData.groupAName,
          // );
          // AuthorizationRoles.clickAssignUsersButton();
          // cy.wait(3000);
          // AuthorizationRoles.selectFilterOptionInAssignModal(
          //   testData.filtername,
          //   testData.optionName,
          //   true,
          //   true,
          // );
          // AuthorizationRoles.clickResetAllInAssignModal();
          // AuthorizationRoles.selectUserInModal(testData.userA.username, false);
          // AuthorizationRoles.selectUserInModal(testData.userB.username);
          // AuthorizationRoles.selectUserInModal(testData.userC.username);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.verifyAssignedUsersAccordion();
          // AuthorizationRoles.checkUsersAccordion(2);
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.userB.lastName,
          //   testData.userB.firstName,
          //   true,
          //   testData.groupBName,
          // );
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.userC.lastName,
          //   testData.userC.firstName,
          //   true,
          //   testData.groupCName,
          // );
          // AuthorizationRoles.closeRoleDetailView(testData.roleName);
          // AuthorizationRoles.clickOnRoleName(testData.roleName);
          // AuthorizationRoles.verifyAssignedUsersAccordion();
          // AuthorizationRoles.checkUsersAccordion(2);
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.userB.lastName,
          //   testData.userB.firstName,
          //   true,
          //   testData.groupBName,
          // );
          // AuthorizationRoles.verifyAssignedUser(
          //   testData.userC.lastName,
          //   testData.userC.firstName,
          //   true,
          //   testData.groupCName,
          // );
          // AuthorizationRoles.clickAssignUsersButton();
          // cy.wait(3000);
          // AuthorizationRoles.selectUserInModal(testData.userB.username, false);
          // AuthorizationRoles.selectUserInModal(testData.userC.username, false);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        },
      );
    });
  });
});
