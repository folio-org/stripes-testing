import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
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
      role0Name: `AT_C627435_UserRole_0_${getRandomPostfix()}`,
      roleAName: `AT_C627435_UserRole_A_${getRandomPostfix()}`,
      roleBName: `AT_C627435_UserRole_B_${getRandomPostfix()}`,
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
      cy.createTempUser([]).then((createdUserBProperties) => {
        testData.userB = createdUserBProperties;
      });
      cy.createAuthorizationRoleApi(testData.role0Name).then((role0) => {
        testData.role0Id = role0.id;
        cy.createAuthorizationRoleApi(testData.roleAName).then((roleA) => {
          testData.roleAId = roleA.id;
          cy.createAuthorizationRoleApi(testData.roleBName).then((roleB) => {
            testData.roleBId = roleB.id;
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
      if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userB.userId, [testData.role0Id]);
      else cy.addRolesToNewUserApi(testData.userB.userId, [testData.role0Id]);
      cy.login(testData.tempUser.username, testData.tempUser.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
      UsersSearchPane.searchByUsername(testData.userB.username);
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      cy.deleteAuthorizationRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleBId);
      cy.deleteAuthorizationRoleApi(testData.role0Id);
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C627435 [UIU-3301] Assigned roles shown in user detailed view while having ui-users.roles - Manage (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C627435'] },
      () => {
        UsersSearchPane.selectUserFromList(testData.userB.username);
        UsersCard.verifyUserRolesCounter('1');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.role0Name]);

        UsersSearchPane.searchByUsername(testData.userA.username);
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UsersCard.verifyUserRolesCounter('0');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRolesAccordionEmpty();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleAName);
        AuthorizationRoles.clickOnRoleName(testData.roleAName);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);

        AuthorizationRoles.searchRole(testData.roleBName);
        AuthorizationRoles.clickOnRoleName(testData.roleBName);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByUsername(testData.userA.username);
        cy.wait(3000);
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UsersCard.verifyUserRolesCounter('2');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleAName, testData.roleBName]);
      },
    );
  });
});
