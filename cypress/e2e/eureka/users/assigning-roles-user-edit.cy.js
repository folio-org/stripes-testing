import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      roleAName: `Auto Role A C466113 ${getRandomPostfix()}`,
      roleBName: `Auto Role B C466113 ${getRandomPostfix()}`,
      roleCName: `Auto Role C C466113 ${getRandomPostfix()}`,
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
      cy.deleteCapabilitiesFromRoleApi(testData.roleAId);
      cy.deleteCapabilitiesFromRoleApi(testData.roleBId);
      cy.deleteCapabilitySetsFromRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleBId);
      cy.deleteAuthorizationRoleApi(testData.roleCId);
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C466113 Assigning roles to a user when editing user (eureka)',
      { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
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
        cy.intercept('GET', '/roles/users*').as('rolesCall');
        UserEdit.saveAndClose();
        cy.wait('@rolesCall').then((call) => {
          expect(call.response.statusCode).to.eq(200);
          expect(call.response.body.userRoles).to.have.lengthOf(2);
        });
        UsersCard.verifyUserRolesCounter('2');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNamesOrdered([testData.roleBName, testData.roleCName]);

        cy.visit(TopMenu.settingsAuthorizationRoles);
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
