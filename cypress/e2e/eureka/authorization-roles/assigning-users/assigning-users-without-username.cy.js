import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      describe('Assigning users', () => {
        const randomPostfix = getRandomPostfix();
        const userIds = [];
        const userBodies = [];
        const testData = {
          roleAName: `Auto Role A C451621 ${randomPostfix}`,
          roleBName: `Auto Role B C451621 ${randomPostfix}`,
          promotePath: '/users-keycloak/auth-users',
        };

        const capabSetsToAssign = [
          { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
          { type: 'Data', resource: 'Roles Users', action: 'Manage' },
          { type: 'Data', resource: 'Users', action: 'Manage' },
        ];

        const capabsToAssign = [
          { type: 'Settings', resource: 'Settings Enabled', action: 'View' },
          { type: 'Data', resource: 'Users-Keycloak Auth-Users Item', action: 'View' },
          { type: 'Data', resource: 'Users-Keycloak Auth-Users Item', action: 'Create' },
        ];

        before('Create data', () => {
          cy.getAdminToken();
          cy.getUserGroups().then(() => {
            for (let i = 1; i < 4; i++) {
              userBodies.push({
                type: 'staff',
                active: true,
                username: `user${i}c451621${randomPostfix}`,
                patronGroup: Cypress.env('userGroups')[i - 1].id,
                personal: {
                  lastName: `First ${i} c451621${randomPostfix}`,
                  firstName: `Last ${i} c451621${randomPostfix}`,
                  email: 'testuser@test.org',
                  preferredContactTypeId: '002',
                },
              });
            }
            testData.userAGroup = Cypress.env('userGroups')[0].group;
            testData.userBGroup = Cypress.env('userGroups')[1].group;
            testData.userCGroup = Cypress.env('userGroups')[2].group;
            delete userBodies[0].username;
            cy.createUserWithoutKeycloakInEurekaApi(userBodies[0]).then((userId) => {
              testData.userAId = userId;
              userIds.push(userId);
            });
            cy.createUserWithoutKeycloakInEurekaApi(userBodies[1]).then((userId) => {
              testData.userBId = userId;
              userIds.push(userId);
            });
            Users.createViaApi(userBodies[2]).then((user) => {
              testData.userCId = user.id;
              userIds.push(user.id);
            });
            cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
              testData.roleAId = role.id;
            });
            cy.createAuthorizationRoleApi(testData.roleBName).then((role) => {
              testData.roleBId = role.id;
            });
            cy.createTempUser([]).then((createdUserProperties) => {
              testData.tempUser = createdUserProperties;
              cy.assignCapabilitiesToExistingUser(
                testData.tempUser.userId,
                capabsToAssign,
                capabSetsToAssign,
              );
              cy.login(testData.tempUser.username, testData.tempUser.password, {
                path: TopMenu.settingsAuthorizationRoles,
                waiter: AuthorizationRoles.waitContentLoading,
              });
            });
          });
        });

        after('Delete data', () => {
          cy.getAdminToken();
          cy.deleteAuthorizationRoleApi(testData.roleAId);
          cy.deleteAuthorizationRoleApi(testData.roleBId);
          userIds.forEach((id) => {
            Users.deleteViaApi(id);
          });
          Users.deleteViaApi(testData.tempUser.userId);
          userIds.forEach((id) => {
            cy.deleteUserWithoutKeycloakInEurekaApi(id);
          });
        });

        it(
          'C584420 Assigning users without username for an existing authorization role (eureka)',
          { tags: ['criticalPath', 'eureka'] },
          () => {
            AuthorizationRoles.searchRole(testData.roleAName);
            AuthorizationRoles.clickOnRoleName(testData.roleAName, false);
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[0].personal.lastName);
            AuthorizationRoles.selectUserInModal(userBodies[1].username);
            AuthorizationRoles.selectUserInModal(userBodies[2].username);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkPromoteUsersModal([testData.userAId, testData.userBId], true);
            AuthorizationRoles.clickConfirmInPromoteUsersModal();
            AuthorizationRoles.checkNoUsernameErrorCallout();
            AuthorizationRoles.verifyAssignedUsersAccordion();
            AuthorizationRoles.checkUsersAccordion(1);
            AuthorizationRoles.verifyAssignedUser(
              userBodies[2].personal.lastName,
              userBodies[2].personal.firstName,
              true,
              testData.userCGroupName,
            );

            AuthorizationRoles.searchRole(testData.roleBName);
            AuthorizationRoles.clickOnRoleName(testData.roleBName, false);
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[0].personal.lastName);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkPromoteUsersModal([testData.userAId]);
            cy.intercept(`${testData.promotePath}/${testData.userAId}`).as('promoteA');
            AuthorizationRoles.clickConfirmInPromoteUsersModal();
            cy.wait('@promoteA').its('response.statusCode').should('eq', 400);
            AuthorizationRoles.checkNoUsernameErrorCallout();
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
          },
        );
      });
    });
  });
});
