import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      roleAName: `AT_C627439_UserRole_A_${getRandomPostfix()}`,
      roleBName: `AT_C627439_UserRole_B_${getRandomPostfix()}`,
      roleCName: `AT_C627439_UserRole_C_${getRandomPostfix()}`,
      roleDName: `AT_C627439_UserRole_D_${getRandomPostfix()}`,
    };

    const capabSetsToAssign = [{ type: 'Data', resource: 'UI-Users Roles', action: 'Manage' }];

    const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];

    before('Create users, roles', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.tempUser = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.tempUser.userId,
          capabsToAssign,
          capabSetsToAssign,
        );
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
      });
      cy.createTempUser([]).then((createdUserAProperties) => {
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

    before('Assign roles, login', () => {
      cy.getAdminToken();
      if (Cypress.env('runAsAdmin')) {
        cy.updateRolesForUserApi(testData.userA.userId, [
          testData.roleAId,
          testData.roleBId,
          testData.roleCId,
          testData.roleDId,
        ]);
      } else {
        cy.addRolesToNewUserApi(testData.userA.userId, [
          testData.roleAId,
          testData.roleBId,
          testData.roleCId,
          testData.roleDId,
        ]);
      }
      cy.waitForAuthRefresh(() => {
        cy.login(testData.tempUser.username, testData.tempUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        cy.reload();
        Users.waitLoading();
      }, 20_000);
      UsersSearchPane.searchByUsername(testData.userA.username);
      cy.wait(2000);
      UsersSearchPane.selectUserFromList(testData.userA.username);
      UsersCard.waitLoading();
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      cy.deleteAuthorizationRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleBId);
      cy.deleteAuthorizationRoleApi(testData.roleCId);
      cy.deleteAuthorizationRoleApi(testData.roleDId);
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C627439 [UIU-3301] Unassigning roles when editing user while having ui-users.roles - Manage (eureka)',
      { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C627439'] },
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
        UsersCard.close();
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(testData.userA.username);
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UsersCard.verifyUserRolesCounter('2');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
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

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
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
        cy.intercept('GET', '/roles/users*').as('rolesCall');
        UserEdit.saveUserEditForm();
        cy.wait('@rolesCall').then((call) => {
          expect(call.response.statusCode).to.eq(200);
          expect(call.response.body.userRoles).to.have.lengthOf(0);
        });
        UsersCard.waitLoading();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
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
