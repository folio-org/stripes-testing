import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import generateItemBarcode from '../../../../support/utils/generateItemBarcode';
import { APPLICATION_NAMES } from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      describe('Assigning users', () => {
        const randomString = generateItemBarcode();
        const testData = {
          lastName: `TestC442842User${randomString}`,
          userEmail: 'test@folio.org',
          username: `userc448284${randomString}`,
          roleName: `Auto Role C451629 ${randomString}`,
          promotePath: '/users-keycloak/auth-users',
        };

        const capabSetsToAssign = [
          { type: 'Data', resource: 'UI-Users', action: 'View' },
          { type: 'Data', resource: 'UI-Users', action: 'Create' },
          { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
          { type: 'Data', resource: 'Roles Users', action: 'Manage' },
        ];
        const capabsToAssign = [
          { type: 'Data', resource: 'UI-Users', action: 'View' },
          { type: 'Data', resource: 'UI-Users', action: 'Create' },
          { type: 'Settings', resource: 'Settings Enabled', action: 'View' },
          { type: 'Data', resource: 'Users-Keycloak Auth-Users Item', action: 'View' },
          { type: 'Data', resource: 'Users-Keycloak Auth-Users Item', action: 'Create' },
        ];

        before('Create user, role, login', () => {
          cy.getAdminToken();
          cy.createUserGroupApi().then((group) => {
            testData.userGroup = group;
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
            cy.login(testData.tempUser.username, testData.tempUser.password, {
              path: TopMenu.usersPath,
              waiter: Users.waitLoading,
            });
          });
        });

        after('Delete users', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.tempUser.userId);
          Users.deleteViaApi(testData.userId);
          cy.deleteAuthorizationRoleApi(testData.roleId);
        });

        it(
          'C451629 Assigning new user created in UI for an existing authorization role (eureka)',
          { tags: ['criticalPath', 'eureka', 'C451629'] },
          () => {
            const userGroupOption = testData.userGroup.group + ' (' + testData.userGroup.desc + ')';
            Users.clickNewButton();
            Users.checkCreateUserPaneOpened();
            UserEdit.fillRequiredFields(
              testData.lastName,
              userGroupOption,
              testData.userEmail,
              null,
              testData.username,
            );
            Users.saveCreatedUser();
            Users.checkCreateUserPaneOpened(false);
            Users.verifyLastNameOnUserDetailsPane(testData.lastName);
            cy.getUserWithBlUsersByUsername(testData.username).then(({ body }) => {
              testData.userId = body.user.id;

              TopMenuNavigation.navigateToApp(
                APPLICATION_NAMES.SETTINGS,
                SETTINGS_SUBSECTION_AUTH_ROLES,
              );
              AuthorizationRoles.waitContentLoading();
              AuthorizationRoles.searchRole(testData.roleName);
              AuthorizationRoles.clickOnRoleName(testData.roleName, false);
              AuthorizationRoles.clickAssignUsersButton();
              AuthorizationRoles.selectUserInModal(testData.username);
              AuthorizationRoles.clickSaveInAssignModal();
              AuthorizationRoles.checkPromoteUsersModal([testData.userId]);
              AuthorizationRoles.clickCancelInPromoteUsersModal();
              AuthorizationRoles.checkUsersAccordion(0);

              AuthorizationRoles.clickAssignUsersButton();
              AuthorizationRoles.selectUserInModal(testData.username);
              AuthorizationRoles.clickSaveInAssignModal();
              AuthorizationRoles.checkPromoteUsersModal([testData.userId]);
              cy.intercept('POST', `${testData.promotePath}/${testData.userId}`).as('promote');
              AuthorizationRoles.clickConfirmInPromoteUsersModal();
              cy.wait('@promote').its('response.statusCode').should('eq', 201);
              AuthorizationRoles.verifyAssignedUsersAccordion(1);
              AuthorizationRoles.verifyAssignedUser(
                testData.lastName,
                null,
                true,
                testData.userGroup.group,
              );
            });
          },
        );
      });
    });
  });
});