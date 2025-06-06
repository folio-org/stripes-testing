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
          roleAName: `AT_C627403_UserRole_A_${randomPostfix}`,
          roleBName: `AT_C627403_UserRole_B_${randomPostfix}`,
          promotePath: '/users-keycloak/auth-users',
        };

        const capabSetsToAssign = [
          { type: 'Settings', resource: 'UI-Authorization-Roles Users Settings', action: 'Manage' },
        ];

        const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

        before('Create data', () => {
          cy.getAdminToken();
          cy.getUserGroups().then(() => {
            for (let i = 1; i < 4; i++) {
              userBodies.push({
                type: 'staff',
                active: true,
                username: `at_c627403_username_${i}_${randomPostfix}`,
                patronGroup: Cypress.env('userGroups')[i - 1].id,
                personal: {
                  lastName: `AT_C627403_LastName_${i}_${randomPostfix}`,
                  firstName: `AT_C627403_FirstName_${i}_${randomPostfix}`,
                  email: 'AT_C627403@test.com',
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
        });

        it(
          'C627403 [UIROLES-125] Assigning users without username for an existing authorization role while having users.settings Manage (eureka)',
          { tags: ['criticalPath', 'eureka', 'C627403'] },
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
