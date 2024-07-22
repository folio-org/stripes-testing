/* eslint-disable no-unused-vars */
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import { randomizeArray } from '../../../support/utils/arrays';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      allRoleNames: [
        `!role ${getRandomPostfix()}`,
        `0 role ${getRandomPostfix()}`,
        `0_role ${getRandomPostfix()}`,
        `5 role ${getRandomPostfix()}`,
        `A new role ${getRandomPostfix()}`,
        `Role A ${getRandomPostfix()}`,
        `Role B ${getRandomPostfix()}`,
        `RoleA ${getRandomPostfix()}`,
        `RoleB ${getRandomPostfix()}`,
        `User role C ${getRandomPostfix()}`,
        `UserroleC ${getRandomPostfix()}`,
      ],
    };

    const originalRoles = randomizeArray(testData.allRoleNames).filter((role) => {
      return !role.includes('0_role') && !role.includes('User role C');
    });

    const capabSetsForTestUser = [
      { type: 'Data', resource: 'Roles Users', action: 'Manage' },
      { type: 'Data', resource: 'Roles', action: 'Manage' },
      { type: 'Data', resource: 'UI-Users', action: 'View' },
      { type: 'Data', resource: 'UI-Users', action: 'Edit' },
    ];
    const capabsForTestUser = [
      { type: 'Data', resource: 'UI-Users', action: 'View' },
      { type: 'Data', resource: 'UI-Users', action: 'Edit' },
    ];

    before('Create users, roles', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.tempUser = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.tempUser.userId,
          capabsForTestUser,
          capabSetsForTestUser,
        );
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
      });
      cy.createTempUser([]).then((createdUserAProperties) => {
        testData.userA = createdUserAProperties;
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);
      });
      testData.allRoleNames.forEach((roleName) => {
        cy.createAuthorizationRoleApi(roleName).then((role) => {
          testData[roleName] = {};
          testData[roleName].id = role.id;
        });
      });
    });

    before('Assign roles, login', () => {
      cy.getAdminToken();
      const originalRoleIds = originalRoles.map((roleName) => testData[roleName].id);
      if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, originalRoleIds);
      else cy.addRolesToNewUserApi(testData.userA.userId, originalRoleIds);
      cy.login(testData.tempUser.username, testData.tempUser.password, {
        path: `${TopMenu.usersPath}/preview/${testData.userA.userId}`,
        waiter: UsersCard.waitLoading,
      });
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      testData.allRoleNames.forEach((roleName) => {
        cy.deleteAuthorizationRoleApi(testData[roleName].id);
      });
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C476793 Roles rows are sorted when viewing/editing a user (eureka)',
      { tags: ['criticalPath', 'eureka'] },
      () => {
        // cy.reload();
        // AuthorizationRoles.waitContentLoading();
        // AuthorizationRoles.searchRole(testData.roleAName);
        // AuthorizationRoles.clickOnRoleName(testData.roleAName);
        // AuthorizationRoles.verifyRoleViewPane(testData.roleAName);
        // AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        // AuthorizationRoles.clickAssignUsersButton();
        // AuthorizationRoles.selectUserInModal(testData.userA.username, false);
        // AuthorizationRoles.clickSaveInAssignModal();
        // AuthorizationRoles.verifyAssignedUser(
        //   testData.userA.lastName,
        //   testData.userA.firstName,
        //   false,
        // );

        // cy.visit(`${TopMenu.settingsAuthorizationRoles}/${testData.roleCId}`);
        // AuthorizationRoles.verifyRoleViewPane(testData.roleCName);
        // AuthorizationRoles.verifyAssignedUser(
        //   testData.userA.lastName,
        //   testData.userA.firstName,
        //   false,
        // );
        // AuthorizationRoles.clickAssignUsersButton();
        // AuthorizationRoles.selectUserInModal(testData.userA.username);
        // AuthorizationRoles.clickSaveInAssignModal();
        // AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);

        UsersCard.verifyUserRolesCounter(originalRoles.length + '');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames(originalRoles);

        // cy.visit(`${TopMenu.settingsAuthorizationRoles}/${testData.roleBId}`);
        // AuthorizationRoles.verifyRoleViewPane(testData.roleBName);
        // AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        // AuthorizationRoles.clickAssignUsersButton();
        // AuthorizationRoles.selectUserInModal(testData.userA.username, false);
        // AuthorizationRoles.clickSaveInAssignModal();
        // AuthorizationRoles.verifyAssignedUser(
        //   testData.userA.lastName,
        //   testData.userA.firstName,
        //   false,
        // );

        // cy.visit(`${TopMenu.settingsAuthorizationRoles}/${testData.roleCId}`);
        // AuthorizationRoles.verifyRoleViewPane(testData.roleCName);
        // AuthorizationRoles.verifyAssignedUser(testData.userA.lastName, testData.userA.firstName);
        // AuthorizationRoles.clickAssignUsersButton();
        // AuthorizationRoles.selectUserInModal(testData.userA.username, false);
        // AuthorizationRoles.clickSaveInAssignModal();
        // AuthorizationRoles.verifyAssignedUser(
        //   testData.userA.lastName,
        //   testData.userA.firstName,
        //   false,
        // );

        // cy.visit(`${TopMenu.usersPath}/preview/${testData.userA.userId}`);
        // UsersCard.waitLoading();
        // UsersCard.verifyUserRolesCounter('0');
        // UsersCard.clickUserRolesAccordion();
        // UsersCard.verifyUserRolesAccordionEmpty();
      },
    );
  });
});
