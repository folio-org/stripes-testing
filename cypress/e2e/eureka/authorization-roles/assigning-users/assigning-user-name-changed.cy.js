import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../../support/fragments/topMenu';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

describe('Eureka', () => {
  describe('Authorization roles', () => {
    describe('Assigning users', () => {
      const testData = {
        roleAName: `AT_C627394_UserRole_A_${getRandomPostfix()}`,
        roleBName: `AT_C627394_UserRole_B_${getRandomPostfix()}`,
        newUsername: `at_c627394_username_${getRandomLetters(6)}`,
        newLastName: `AT_C627394_LastName_${getRandomLetters(6)}`,
        newFirstName: `AT_C627394_FirstName${getRandomLetters(6)}`,
        newEmailAddress: `AT_C627394_${getRandomLetters(6)}@test.com`,
      };

      const capabSetsToAssign = [
        { type: 'Settings', resource: 'UI-Authorization-Roles Users Settings', action: 'Manage' },
        { type: 'Data', resource: 'UI-Users', action: 'Edit' },
      ];

      const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

      before('Create users, roles', () => {
        cy.getAdminToken().then(() => {
          cy.getUserGroups().then(() => {
            testData.groupAName = Cypress.env('userGroups')[0].group;
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
                if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);
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
      });

      after('Delete roles, users', () => {
        cy.getAdminToken();
        cy.deleteAuthorizationRoleApi(testData.roleAId);
        cy.deleteAuthorizationRoleApi(testData.roleBId);
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.tempUser.userId);
      });

      it(
        'C627394 [UIROLES-125] Assigning/unassigning a user for a role after username changed while having users.settings Manage (eureka)',
        { tags: ['extendedPath', 'eureka', 'eurekaPhase1', 'C627394'] },
        () => {
          const usersCallRegExpGetA = new RegExp(
            `\\/roles\\/users\\?.+query=roleId==${testData.roleAId}`,
          );
          const usersCallRegExpGetB = new RegExp(
            `\\/roles\\/users\\?.+query=roleId==${testData.roleBId}`,
          );

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

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(testData.userA.username);
          UsersSearchPane.selectUserFromList(testData.userA.username);
          UsersCard.waitLoading();
          UserEdit.openEdit();
          UserEdit.editUsername(testData.newUsername);
          UserEdit.fillLastFirstNames(testData.newLastName, testData.newFirstName);
          UserEdit.fillEmailAddress(testData.newEmailAddress);
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();

          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            SETTINGS_SUBSECTION_AUTH_ROLES,
          );
          AuthorizationRoles.waitLoading();
          AuthorizationRoles.searchRole(testData.roleBName);
          AuthorizationRoles.clickOnRoleName(testData.roleBName);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.newUsername);
          cy.intercept(usersCallRegExpGetB).as('usersGetB');
          cy.intercept('PUT', '/roles/users/*').as('usersPutB');
          AuthorizationRoles.clickSaveInAssignModal();
          cy.wait('@usersGetB').then((call) => {
            expect(call.response.statusCode).to.eq(200);
            expect(
              call.response.body.userRoles.filter(
                (userRole) => userRole.userId === testData.userA.userId,
              ),
            ).to.have.lengthOf(1);
          });
          cy.wait('@usersPutB').its('response.statusCode').should('eq', 204);
          AuthorizationRoles.verifyAssignedUser(testData.newLastName, testData.newFirstName);

          cy.intercept(usersCallRegExpGetA).as('usersGetA1');
          AuthorizationRoles.searchRole(testData.roleAName);
          AuthorizationRoles.clickOnRoleName(testData.roleAName);
          cy.wait('@usersGetA1').then((call) => {
            expect(call.response.statusCode).to.eq(200);
            expect(
              call.response.body.userRoles.filter(
                (userRole) => userRole.userId === testData.userA.userId,
              ),
            ).to.have.lengthOf(1);
          });
          AuthorizationRoles.verifyRoleViewPane(testData.roleAName);
          AuthorizationRoles.verifyAssignedUser(testData.newLastName, testData.newFirstName);
          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(testData.newUsername, false);
          cy.intercept(usersCallRegExpGetA).as('usersGetA2');
          cy.intercept('PUT', '/roles/users/*').as('usersPutA');
          AuthorizationRoles.clickSaveInAssignModal();
          cy.wait('@usersPutA').its('response.statusCode').should('eq', 204);
          cy.wait('@usersGetA2').then((call) => {
            expect(call.response.statusCode).to.eq(200);
            expect(
              call.response.body.userRoles.filter(
                (userRole) => userRole.userId === testData.userA.userId,
              ),
            ).to.have.lengthOf(0);
          });
          AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        },
      );
    });
  });
});
