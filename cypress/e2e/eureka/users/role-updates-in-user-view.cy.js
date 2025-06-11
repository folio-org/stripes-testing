import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      roleAName: `AT_C464315_UserRole_A_${getRandomPostfix()}`,
      roleBName: `AT_C464315_UserRole_B_${getRandomPostfix()}`,
      roleCName: `AT_C464315_UserRole_C_${getRandomPostfix()}`,
    };

    const capabSetsToAssign = [
      { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
      { type: 'Data', resource: 'Roles Users', action: 'Manage' },
      { type: 'Data', resource: 'UI-Users Roles', action: 'View' },
    ];

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
            cy.getCapabilitiesApi(3).then((capabs) => {
              cy.getCapabilitySetsApi(5).then((capabSets) => {
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
      if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, [testData.roleAId, testData.roleBId]);
      else cy.addRolesToNewUserApi(testData.userA.userId, [testData.roleAId, testData.roleBId]);
      cy.login(testData.tempUser.username, testData.tempUser.password, {
        path: TopMenu.settingsAuthorizationRoles,
        waiter: AuthorizationRoles.waitContentLoading,
      });
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
      'C464315 User detailed view updated when changing role assignments for a user (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C464315'] },
      () => {
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleAName);
        AuthorizationRoles.clickOnRoleName(testData.roleAName);
        AuthorizationRoles.verifyRoleViewPane(testData.roleAName);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username, false);
        AuthorizationRoles.clickSaveInAssignModal();
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
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersSearchPane.searchByKeywords(testData.userA.userId);
        UsersCard.verifyUserCardOpened();
        UsersCard.verifyUserRolesCounter('2');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleBName, testData.roleCName]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();
        AuthorizationRoles.searchRole(testData.roleBName);
        AuthorizationRoles.clickOnRoleName(testData.roleBName);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username, false);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );

        AuthorizationRoles.searchRole(testData.roleCName);
        AuthorizationRoles.clickOnRoleName(testData.roleCName);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username, false);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(testData.userA.userId);
        UsersCard.verifyUserCardOpened();
        UsersCard.verifyUserRolesCounter('0');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRolesAccordionEmpty();
      },
    );
  });
});
