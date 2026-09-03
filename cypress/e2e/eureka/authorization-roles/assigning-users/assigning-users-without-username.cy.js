import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      describe('Assigning users', () => {
        const randomPostfix = getRandomPostfix();
        const userIds = [];
        const userBodies = [];
        const testData = {
          roleAName: `AT_C1504509_UserRole_A_${randomPostfix}`,
          roleBName: `AT_C1504509_UserRole_B_${randomPostfix}`,
        };

        const capabSetsToAssign = [CapabilitySets.uiAuthorizationRolesUsersSettingsManage];

        before('Create data', () => {
          cy.getAdminToken();
          cy.getUserGroups().then(() => {
            for (let i = 1; i < 4; i++) {
              userBodies.push({
                type: 'staff',
                active: true,
                username: `at_c1504509_username_${i}_${randomPostfix}`,
                patronGroup: Cypress.env('userGroups')[i - 1].id,
                personal: {
                  lastName: `AT_C1504509_LastName_${i}_${randomPostfix}`,
                  firstName: `AT_C1504509_FirstName_${i}_${randomPostfix}`,
                  email: 'AT_C1504509@test.com',
                  preferredContactTypeIds: ['002'],
                },
              });
            }
            testData.userAGroup = Cypress.env('userGroups')[0].group;
            testData.userBGroup = Cypress.env('userGroups')[1].group;
            testData.userCGroup = Cypress.env('userGroups')[2].group;
            // User A: with Keycloak + username; User B: no Keycloak, with username; User C: no username
            delete userBodies[2].username;
            cy.ifConsortia(true, () => {
              userBodies[2].type = 'patron';
            });
            Users.createViaApi(userBodies[0], { keycloak: true }).then((user) => {
              testData.userAId = user.id;
              userIds.push(user.id);
            });
            Users.createViaApi(userBodies[1]).then((user) => {
              testData.userBId = user.id;
              userIds.push(user.id);
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
              cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsToAssign);
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
          'C1504509 Assigning users with and without username to an authorization role (eureka)',
          { tags: ['criticalPath', 'eureka', 'C1504509'] },
          () => {
            // Steps 1-5: Role A — select all 3 users (including User C without username) → error
            AuthorizationRoles.searchRole(testData.roleAName);
            AuthorizationRoles.clickOnRoleName(testData.roleAName, false);
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[0].username);
            AuthorizationRoles.selectUserInModal(userBodies[1].username);
            AuthorizationRoles.selectUserInModal(userBodies[2].personal.lastName);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkNoUsernameErrorCallout();
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();

            // Steps 6-7: Role A — select only User A (keycloak) and User B (no keycloak) → confirm Keycloak creation → success
            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[0].username);
            AuthorizationRoles.selectUserInModal(userBodies[1].username);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkPromoteUsersModal([testData.userBId]);
            AuthorizationRoles.clickConfirmInPromoteUsersModal();
            AuthorizationRoles.verifyAssignedUser(
              userBodies[0].personal.lastName,
              userBodies[0].personal.firstName,
              true,
              testData.userAGroup,
            );
            AuthorizationRoles.verifyAssignedUser(
              userBodies[1].personal.lastName,
              userBodies[1].personal.firstName,
              true,
              testData.userBGroup,
            );

            // Steps 8-11: Role B — select only User C (no username) → error
            AuthorizationRoles.searchRole(testData.roleBName);
            AuthorizationRoles.clickOnRoleName(testData.roleBName, false);
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
            AuthorizationRoles.clickAssignUsersButton();
            AuthorizationRoles.selectUserInModal(userBodies[2].personal.lastName);
            AuthorizationRoles.clickSaveInAssignModal();
            AuthorizationRoles.checkNoUsernameErrorCallout();
            AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
          },
        );
      });
    });
  });
});
