import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      roleAName: `Auto Role A C464315 ${getRandomPostfix()}`,
      roleBName: `Auto Role B C464315 ${getRandomPostfix()}`,
      roleCName: `Auto Role C C464315 ${getRandomPostfix()}`,
    };

    const capabSetsToAssign = [
      { type: 'Settings', resource: 'UI-Authorization-Roles Settings Admin', action: 'View' },
      { type: 'Data', resource: 'Capabilities', action: 'Manage' },
      { type: 'Data', resource: 'Role-Capability-Sets', action: 'Manage' },
      { type: 'Data', resource: 'Roles Users', action: 'Manage' },
      { type: 'Data', resource: 'UI-Users', action: 'View' },
    ];

    before('Create users, roles', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.tempUser = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsToAssign);
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
      'C464315 User detailed view updated when changing role assignments for a user (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
      () => {
        cy.reload();
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

        cy.visit(`${TopMenu.settingsAuthorizationRoles}/${testData.roleCId}`);
        AuthorizationRoles.verifyRoleViewPane(testData.roleCName);
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);

        cy.visit(`${TopMenu.usersPath}/preview/${testData.userA.userId}`);
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter('2');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleBName, testData.roleCName]);

        cy.visit(`${TopMenu.settingsAuthorizationRoles}/${testData.roleBId}`);
        AuthorizationRoles.verifyRoleViewPane(testData.roleBName);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username, false);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );

        cy.visit(`${TopMenu.settingsAuthorizationRoles}/${testData.roleCId}`);
        AuthorizationRoles.verifyRoleViewPane(testData.roleCName);
        AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(testData.userA.username, false);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(
          testData.userA.lastName,
          testData.userA.firstName,
          false,
        );

        cy.visit(`${TopMenu.usersPath}/preview/${testData.userA.userId}`);
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter('0');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRolesAccordionEmpty();
      },
    );
  });
});
