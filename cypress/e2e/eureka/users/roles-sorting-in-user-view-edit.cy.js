import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import { randomizeArray } from '../../../support/utils/arrays';
import UserEdit from '../../../support/fragments/users/userEdit';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      allRoleNamesSorted: [
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

    const originalRoleNamesSorted = testData.allRoleNamesSorted.filter((role) => {
      return role !== testData.allRoleNamesSorted[2] && role !== testData.allRoleNamesSorted[9];
    });
    const originalRoleNamesRandomized = randomizeArray([...originalRoleNamesSorted]);

    const roleToRemove = testData.allRoleNamesSorted[6];

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
      testData.allRoleNamesSorted.forEach((roleName) => {
        cy.createAuthorizationRoleApi(roleName).then((role) => {
          testData[roleName] = {};
          testData[roleName].id = role.id;
        });
      });
    });

    before('Assign roles, login', () => {
      cy.getAdminToken();
      const originalRoleIds = originalRoleNamesRandomized.map((roleName) => testData[roleName].id);
      if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, originalRoleIds);
      else cy.addRolesToNewUserApi(testData.userA.userId, originalRoleIds);
      cy.login(testData.tempUser.username, testData.tempUser.password, {
        path: `${TopMenu.usersPath}/preview/${testData.userA.userId}`,
        waiter: UsersCard.waitLoading,
      });
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      testData.allRoleNamesSorted.forEach((roleName) => {
        cy.deleteAuthorizationRoleApi(testData[roleName].id);
      });
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C476793 Roles rows are sorted when viewing/editing a user (eureka)',
      { tags: ['criticalPath', 'eureka'] },
      () => {
        UsersCard.verifyUserRolesCounter(originalRoleNamesRandomized.length + '');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNamesOrdered(originalRoleNamesSorted);

        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(originalRoleNamesRandomized.length + '');
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRoleNames(originalRoleNamesRandomized);
        UserEdit.verifyUserRoleNamesOrdered(originalRoleNamesSorted);
        UserEdit.verifyUserRolesRowsCount(originalRoleNamesRandomized.length);
        UserEdit.removeOneRole(roleToRemove);
        UserEdit.verifyUserRoleNamesOrdered(
          originalRoleNamesSorted.filter((roleName) => roleName !== roleToRemove),
        );
        UserEdit.verifyUserRolesRowsCount(originalRoleNamesRandomized.length - 1);

        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();
        UserEdit.selectRoleInModal(testData.allRoleNamesSorted[9]);
        UserEdit.selectRoleInModal(testData.allRoleNamesSorted[2]);
        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNamesOrdered(
          testData.allRoleNamesSorted.filter((roleName) => roleName !== roleToRemove),
        );
        UserEdit.verifyUserRolesRowsCount(testData.allRoleNamesSorted.length - 1);

        UserEdit.saveAndClose();
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(testData.allRoleNamesSorted.length - 1 + '');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNamesOrdered(
          testData.allRoleNamesSorted.filter((roleName) => roleName !== roleToRemove),
        );
      },
    );
  });
});
