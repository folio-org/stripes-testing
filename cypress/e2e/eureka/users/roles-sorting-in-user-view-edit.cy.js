import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import getRandomPostfix from '../../../support/utils/stringTools';
import { randomizeArray } from '../../../support/utils/arrays';
import UserEdit from '../../../support/fragments/users/userEdit';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

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

    const capabSetsForTestUser = [CapabilitySets.uiUsersRolesManage];

    before('Create users, roles', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.tempUser = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsForTestUser);
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
      });
      cy.createTempUser([]).then((createdUserAProperties) => {
        testData.userA = createdUserAProperties;
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);
      });
      testData.allRoleNamesSorted.forEach((roleName) => {
        cy.createAuthorizationRoleApi(roleName).then((role) => {
          testData[roleName] = { id: role.id };
        });
      });
    });

    before('Assign roles, login', () => {
      cy.getAdminToken();
      const originalRoleIds = originalRoleNamesRandomized.map((roleName) => testData[roleName].id);
      if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, originalRoleIds);
      else cy.addRolesToNewUserApi(testData.userA.userId, originalRoleIds);
      cy.waitForAuthRefresh(() => {
        cy.login(testData.tempUser.username, testData.tempUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        cy.reload();
        Users.waitLoading();
      }, 20_000);
      UsersSearchPane.searchByUsername(testData.userA.username);
      UsersSearchPane.selectUserFromList(testData.userA.username);
      UsersCard.waitLoading();
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
      'C627440 [UIU-3301] Roles rows are sorted when viewing/editing a user while having ui-users.roles - Manage (eureka)',
      { tags: ['extendedPath', 'eureka', 'C627440'] },
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
