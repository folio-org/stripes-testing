import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      roleAName: `AT_C633471_UserRole_A_${getRandomPostfix()}`,
      roleBName: `AT_C633471_UserRole_B_${getRandomPostfix()}`,
      roleCName: `AT_C633471_UserRole_C_${getRandomPostfix()}`,
    };

    const capabSetsToAssign = [CapabilitySets.uiUsersRolesManage];

    const capabsToAssign = [Capabilities.settingsEnabled];

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
      cy.getAdminToken();
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
                  capabSets.map((capab) => capab.id),
                );
              });
            });
          });
        });
      });
    });

    before('Assign roles, login', () => {
      cy.getAdminToken();
      if (Cypress.env('runAsAdmin')) cy.deleteRolesForUserApi(testData.userA.userId);
      cy.login(testData.tempUser.username, testData.tempUser.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
      UsersSearchPane.searchByUsername(testData.userA.username);
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      cy.deleteAuthorizationRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleBId);
      cy.deleteAuthorizationRoleApi(testData.roleCId);
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C633471 [UIU-3301] Assigning roles to a user when editing user while having ui-users.roles - Manage (eureka)',
      { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C633471'] },
      () => {
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UsersCard.verifyUserRolesCounter('0');
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter('0');
        UserEdit.clickUserRolesAccordion();
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();
        UserEdit.selectRoleInModal(testData.roleAName);
        UserEdit.selectRoleInModal(testData.roleBName);
        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNamesOrdered([testData.roleAName, testData.roleBName]);
        UserEdit.verifyUserRolesRowsCount(2);

        UserEdit.clickAddUserRolesButton();
        UserEdit.selectRoleInModal(testData.roleAName, false);
        UserEdit.selectRoleInModal(testData.roleCName);
        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNamesOrdered([testData.roleBName, testData.roleCName]);
        UserEdit.verifyUserRolesRowsCount(2);
        UserEdit.saveAndClose();
        UsersCard.waitLoading();

        // revert the workaround after UIU-3179 is done
        UsersSearchPane.resetAllFilters();
        cy.intercept('GET', '/roles/users*').as('rolesCall');
        UsersSearchPane.searchByKeywords(testData.userA.username);
        cy.wait(2000);
        UsersSearchPane.selectUserFromList(testData.userA.username);
        cy.wait('@rolesCall').then((call) => {
          expect(call.response.statusCode).to.eq(200);
          expect(call.response.body.userRoles).to.have.lengthOf(2);
        });

        UsersCard.verifyUserRolesCounter('2');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNamesOrdered([testData.roleBName, testData.roleCName]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleAName);
        AuthorizationRoles.clickOnRoleName(testData.roleAName);
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );
        AuthorizationRoles.searchRole(testData.roleBName);
        AuthorizationRoles.clickOnRoleName(testData.roleBName);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        AuthorizationRoles.searchRole(testData.roleCName);
        AuthorizationRoles.clickOnRoleName(testData.roleCName);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
      },
    );
  });
});
