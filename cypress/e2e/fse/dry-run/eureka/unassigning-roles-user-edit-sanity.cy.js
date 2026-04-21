import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Users', () => {
    const { user, memberTenant } = parseSanityParameters();

    const testData = {
      roleAName: `AT_C627439_UserRole_A_${getRandomPostfix()}`,
      roleBName: `AT_C627439_UserRole_B_${getRandomPostfix()}`,
      roleCName: `AT_C627439_UserRole_C_${getRandomPostfix()}`,
      roleDName: `AT_C627439_UserRole_D_${getRandomPostfix()}`,
      patronGroupName: `AT_C627439_UserGroup_${getRandomLetters(10)}`,
    };

    before('Create users, roles', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      cy.createUserGroupApi({
        groupName: testData.patronGroupName,
        expirationOffsetInDays: 365,
      }).then((patronGroupBody) => {
        testData.patronGroupId = patronGroupBody.id;

        cy.createTempUser([], testData.patronGroupName).then((createdUserAProperties) => {
          testData.userA = createdUserAProperties;
        });
        cy.createAuthorizationRoleApi(testData.roleAName).then((roleA) => {
          testData.roleAId = roleA.id;
          cy.createAuthorizationRoleApi(testData.roleBName).then((roleB) => {
            testData.roleBId = roleB.id;
            cy.createAuthorizationRoleApi(testData.roleCName).then((roleC) => {
              testData.roleCId = roleC.id;
              cy.getCapabilitiesApi(2).then((capabs) => {
                cy.getCapabilitySetsApi(2).then((capabSets) => {
                  cy.addCapabilitiesToNewRoleApi(
                    testData.roleAId,
                    capabs.map((capab) => capab.id),
                  );
                  cy.addCapabilitiesToNewRoleApi(
                    testData.roleBId,
                    capabs.map((capab) => capab.id),
                  );
                  cy.addCapabilitySetsToNewRoleApi(
                    testData.roleAId,
                    capabSets.map((capabSet) => capabSet.id),
                  );
                  cy.addCapabilitySetsToNewRoleApi(
                    testData.roleCId,
                    capabSets.map((capabSet) => capabSet.id),
                  );
                });
              });
            });
          });
        });
        cy.createAuthorizationRoleApi(testData.roleDName).then((roleD) => {
          testData.roleDId = roleD.id;
        });
      });
    });

    before('Assign roles, login', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      cy.addRolesToNewUserApi(testData.userA.userId, [
        testData.roleAId,
        testData.roleBId,
        testData.roleCId,
        testData.roleDId,
      ]);
      cy.waitForAuthRefresh(() => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password);
        cy.allure().logCommandSteps();
        TopMenuNavigation.navigateToAppAdaptive(APPLICATION_NAMES.USERS);
        Users.waitLoading();
      }, 20_000);
      UsersSearchPane.searchByUsername(testData.userA.username);
      cy.wait(2000);
      UsersSearchPane.selectUserFromList(testData.userA.username);
      UsersCard.waitLoading();
    });

    after('Delete roles, users', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      cy.deleteAuthorizationRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleBId);
      cy.deleteAuthorizationRoleApi(testData.roleCId);
      cy.deleteAuthorizationRoleApi(testData.roleDId);
      Users.deleteViaApi(testData.userA.userId);
      cy.deleteUserGroupApi(testData.patronGroupId, true);
    });

    it(
      'C627439 [UIU-3301] Unassigning roles when editing user while having ui-users.roles - Manage (eureka)',
      { tags: ['dryRun', 'eureka', 'C627439'] },
      () => {
        UsersCard.verifyUserRolesCounter('4');
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyUserRolesCounter('4');
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRoleNamesOrdered([
          testData.roleAName,
          testData.roleBName,
          testData.roleCName,
          testData.roleDName,
        ]);
        UserEdit.removeOneRole(testData.roleBName);
        UserEdit.verifyUserRolesRowsCount(3);
        UserEdit.verifyUserRoleNamesOrdered([
          testData.roleAName,
          testData.roleCName,
          testData.roleDName,
        ]);
        UserEdit.removeOneRole(testData.roleDName);
        UserEdit.verifyUserRolesRowsCount(2);
        UserEdit.verifyUserRoleNamesOrdered([testData.roleAName, testData.roleCName]);
        UserEdit.saveAndClose();
        UserEdit.checkUserEditPaneOpened(false);
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter('2');

        TopMenuNavigation.navigateToAppAdaptive(
          APPLICATION_NAMES.SETTINGS,
          SETTINGS_SUBSECTION_AUTH_ROLES,
        );
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleAName);
        AuthorizationRoles.clickOnRoleName(testData.roleAName);
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        AuthorizationRoles.searchRole(testData.roleCName);
        AuthorizationRoles.clickOnRoleName(testData.roleCName);
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        AuthorizationRoles.searchRole(testData.roleBName);
        AuthorizationRoles.clickOnRoleName(testData.roleBName);
        AuthorizationRoles.checkUsersAccordion(0);
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );
        AuthorizationRoles.searchRole(testData.roleDName);
        AuthorizationRoles.clickOnRoleName(testData.roleDName);
        AuthorizationRoles.checkUsersAccordion(0);
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );

        TopMenuNavigation.navigateToAppAdaptive(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersCard.close();
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(testData.userA.username);
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter('2');
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyUserRolesCounter('2');
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRoleNamesOrdered([testData.roleAName, testData.roleCName]);
        UserEdit.verifyUserRolesRowsCount(2);
        UserEdit.unassignAllRoles();
        UserEdit.verifyUserRolesAccordionEmpty();
        UserEdit.saveAndClose();
        UserEdit.checkUserEditPaneOpened(false);
        UsersCard.waitLoading();

        TopMenuNavigation.navigateToAppAdaptive(
          APPLICATION_NAMES.SETTINGS,
          SETTINGS_SUBSECTION_AUTH_ROLES,
        );
        AuthorizationRoles.waitLoading();
        AuthorizationRoles.searchRole(testData.roleAName);
        AuthorizationRoles.clickOnRoleName(testData.roleAName);
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );
        AuthorizationRoles.searchRole(testData.roleCName);
        AuthorizationRoles.clickOnRoleName(testData.roleCName);
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );
      },
    );
  });
});
