import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
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
      roleAName: `Auto Role A C466114 ${getRandomPostfix()}`,
      roleBName: `Auto Role B C466114 ${getRandomPostfix()}`,
      roleCName: `Auto Role C C466114 ${getRandomPostfix()}`,
      roleDName: `Auto Role D C466114 ${getRandomPostfix()}`,
    };

    const capabSetsToAssign = [
      { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
      { type: 'Data', resource: 'Capabilities', action: 'Manage' },
      { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      { type: 'Data', resource: 'Roles Users', action: 'Manage' },
      { type: 'Data', resource: 'UI-Users', action: 'View' },
      { type: 'Data', resource: 'UI-Users', action: 'Edit' },
    ];

    const capabsToAssign = [
      { type: 'Data', resource: 'UI-Users', action: 'View' },
      { type: 'Data', resource: 'UI-Users', action: 'Edit' },
      { type: 'Settings', resource: 'Settings Enabled', action: 'View' },
    ];

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
      cy.login(testData.tempUser.username, testData.tempUser.password, {
        path: `${TopMenu.usersPath}/preview/${testData.userA.userId}`,
        waiter: UsersCard.waitLoading,
      });
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      cy.deleteCapabilitiesFromRoleApi(testData.roleAId);
      cy.deleteCapabilitiesFromRoleApi(testData.roleBId);
      cy.deleteCapabilitySetsFromRoleApi(testData.roleAId);
      cy.deleteCapabilitySetsFromRoleApi(testData.roleCId);
      cy.deleteAuthorizationRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleBId);
      cy.deleteAuthorizationRoleApi(testData.roleCId);
      cy.deleteAuthorizationRoleApi(testData.roleDId);
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C466114 Unassigning roles when editing user (eureka)',
      { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
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
        UsersSearchPane.searchByKeywords(testData.userA.userId);
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
        UserEdit.saveAndClose();
        cy.wait('@rolesCall').then((call) => {
          expect(call.response.statusCode).to.eq(200);
          expect(call.response.body.userRoles).to.have.lengthOf(0);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleAName);
        AuthorizationRoles.clickOnRoleName(testData.roleAName);
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
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
