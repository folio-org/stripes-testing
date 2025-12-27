import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import generateItemBarcode from '../../../../support/utils/generateItemBarcode';
import { APPLICATION_NAMES } from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      describe('Assigning users', () => {
        const randomString = generateItemBarcode();
        const testData = {
          lastName: `AT_C627399_LastName_${randomString}`,
          userEmail: 'AT_C627399@test.com',
          username: `at_c627399_username_${randomString}`,
          roleName: `AT_C627399_UserRole${randomString}`,
          promotePath: '/users-keycloak/auth-users',
          userType: 'Staff',
        };

        const capabSetsToAssign = [
          CapabilitySets.uiUsersCreate,
          CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
        ];
        const capabsToAssign = [
          Capabilities.settingsEnabled,
          Capabilities.usersBlUsersByUsernameItem,
        ];

        before('Create user, role, login', () => {
          cy.getAdminToken();
          cy.then(() => {
            cy.createUserGroupApi().then((group) => {
              testData.userGroup = group;
            });
            cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
              testData.roleId = role.id;
            });
          }).then(() => {
            cy.createTempUser([]).then((createdUserProperties) => {
              testData.tempUser = createdUserProperties;
              cy.assignCapabilitiesToExistingUser(
                testData.tempUser.userId,
                capabsToAssign,
                capabSetsToAssign,
              );
              cy.waitForAuthRefresh(() => {
                cy.login(testData.tempUser.username, testData.tempUser.password, {
                  path: TopMenu.usersPath,
                  waiter: Users.waitLoading,
                });
              }, 20_000);
              Users.waitLoading();
            });
          });
        });

        after('Delete users', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.tempUser.userId);
          Users.deleteViaApi(testData.userId);
          cy.deleteAuthorizationRoleApi(testData.roleId);
          cy.deleteUserGroupApi(testData.userGroup.id, true);
        });

        it(
          'C627399 [UIROLES-125] Assigning new user created in UI to an existing authorization role while having users.settings Manage (eureka)',
          { tags: ['smoke', 'eureka', 'C627399'] },
          () => {
            const userGroupOption = testData.userGroup.group + ' (' + testData.userGroup.desc + ')';
            Users.clickNewButton();
            Users.checkCreateUserPaneOpened();
            UserEdit.fillRequiredFields(
              testData.lastName,
              userGroupOption,
              testData.userEmail,
              testData.userType,
              testData.username,
            );
            Users.saveCreatedUser();
            Users.checkCreateUserPaneOpened(false);
            Users.verifyLastNameOnUserDetailsPane(testData.lastName);
            cy.getToken(testData.tempUser.username, testData.tempUser.password);
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
              AuthorizationRoles.verifyAssignedUsersAccordion();
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
