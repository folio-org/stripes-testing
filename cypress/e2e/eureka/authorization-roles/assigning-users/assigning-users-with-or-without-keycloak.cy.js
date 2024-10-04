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
          roleName: `Auto Role C499896 ${randomPostfix}`,
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
                username: `user${i}c499869${randomPostfix}`,
                patronGroup: Cypress.env('userGroups')[i - 1].id,
                personal: {
                  lastName: `First ${i} c499896${randomPostfix}`,
                  firstName: `Last ${i} c499896${randomPostfix}`,
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
          });
          Users.deleteViaApi(testData.tempUser.userId);
          userIds.forEach((id) => {
            cy.deleteUserWithoutKeycloakInEurekaApi(id);
          });
        });

        it(
          'C499896 Assigning users with/without Keycloak record for an existing authorization role (eureka)',
          { tags: ['criticalPath', 'eureka'] },
          () => {
            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName, false);
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[0].username);
            AuthorizationRoles.selectUserInModal(userBodies[1].username);
            AuthorizationRoles.selectUserInModal(userBodies[2].username);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkPromoteUsersModal([testData.userAId, testData.userBId], true);
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
