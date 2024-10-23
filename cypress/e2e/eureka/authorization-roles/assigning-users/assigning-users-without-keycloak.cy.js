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
          roleName: `Auto Role C451621 ${randomPostfix}`,
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
            cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
              testData.roleId = role.id;
            });
            cy.createTempUser([]).then((createdUserProperties) => {
              testData.tempUser = createdUserProperties;
              cy.assignCapabilitiesToExistingUser(
                testData.tempUser.userId,
                capabsToAssign,
                capabSetsToAssign,
              );
              if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
              cy.login(testData.tempUser.username, testData.tempUser.password, {
                path: TopMenu.settingsAuthorizationRoles,
                waiter: AuthorizationRoles.waitContentLoading,
              });
            });
          });
        });

        after('Delete data', () => {
          cy.getAdminToken();
          cy.deleteAuthorizationRoleApi(testData.roleId);
          userIds.forEach((id) => {
            Users.deleteViaApi(id);
            Users.deleteViaApi(id, true);
          });
          Users.deleteViaApi(testData.tempUser.userId);
        });

        it(
          'C451621 Assigning users not having Keycloak records for an existing authorization role (eureka)',
          { tags: ['criticalPath', 'eureka', 'C451621'] },
          () => {
            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName, false);
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[0].username);
            AuthorizationRoles.selectUserInModal(userBodies[1].username);
            AuthorizationRoles.selectUserInModal(userBodies[2].username);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkPromoteUsersModal([testData.userAId, testData.userBId]);
            AuthorizationRoles.clickCancelInPromoteUsersModal();
            AuthorizationRoles.checkUsersAccordion(1);
            AuthorizationRoles.verifyAssignedUser(
              userBodies[2].personal.lastName,
              userBodies[2].personal.firstName,
              true,
              testData.userCGroupName,
            );

            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[0].username);
            AuthorizationRoles.selectUserInModal(userBodies[1].username);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkPromoteUsersModal([testData.userAId, testData.userBId]);
            AuthorizationRoles.closePromoteUsersModalWithEscapeKey();
            AuthorizationRoles.checkUsersAccordion(1);
            AuthorizationRoles.verifyAssignedUser(
              userBodies[2].personal.lastName,
              userBodies[2].personal.firstName,
              true,
              testData.userCGroupName,
            );

            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[0].username);
            AuthorizationRoles.selectUserInModal(userBodies[1].username);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkPromoteUsersModal([testData.userAId, testData.userBId]);
            cy.intercept(`${testData.promotePath}/${testData.userAId}`).as('promoteA');
            cy.intercept(`${testData.promotePath}/${testData.userBId}`).as('promoteB');
            AuthorizationRoles.clickConfirmInPromoteUsersModal();
            cy.wait('@promoteA').its('response.statusCode').should('eq', 201);
            cy.wait('@promoteB').its('response.statusCode').should('eq', 201);
            AuthorizationRoles.verifyAssignedUsersAccordion();
            AuthorizationRoles.checkUsersAccordion(3);
            AuthorizationRoles.verifyAssignedUser(
              userBodies[0].personal.lastName,
              userBodies[0].personal.firstName,
              true,
              testData.userAGroupName,
            );
            AuthorizationRoles.verifyAssignedUser(
              userBodies[1].personal.lastName,
              userBodies[1].personal.firstName,
              true,
              testData.userBGroupName,
            );
            AuthorizationRoles.verifyAssignedUser(
              userBodies[2].personal.lastName,
              userBodies[2].personal.firstName,
              true,
              testData.userCGroupName,
            );
          },
        );
      });
    });
  });
});
