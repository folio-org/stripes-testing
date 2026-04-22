import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    const roleInfix = `firstSet${getRandomLetters(10)}`;
    const randomPostfix = getRandomPostfix();
    const assignFilterOptions = Object.values(UserEdit.roleAssignmentFilterOptions);
    const testData = {
      setOneRoleNames: [
        `AT_C1307979_UserRole_${roleInfix}_${randomPostfix}_A`,
        `AT_C1307979_UserRole_${roleInfix}_${randomPostfix}_B`,
        `AT_C1307979_UserRole_${roleInfix}_${randomPostfix}_C`,
      ],
      anotherRoleName: `AT_C1307979_UserRole_${randomPostfix}_D`,
    };

    const capabSetsToAssign = [CapabilitySets.uiUsersRolesManage];
    const createdRoleIds = [];

    before('Create users, roles', () => {
      cy.then(() => {
        cy.getAdminToken();
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.tempUser = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsToAssign);
        });
        cy.createTempUser([]).then((createdUserAProperties) => {
          testData.userA = createdUserAProperties;
        });
        [...testData.setOneRoleNames, testData.anotherRoleName].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((createdRole) => {
            createdRoleIds.push(createdRole.id);
          });
        });
      }).then(() => {
        cy.login(testData.tempUser.username, testData.tempUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
        UsersSearchPane.searchByUsername(testData.userA.username);
      });
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      createdRoleIds.forEach((roleId) => {
        cy.deleteAuthorizationRoleApi(roleId);
      });
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      "C1307979 Using filtering and select all function during role assignment for user that doesn't have any roles yet (eureka)",
      { tags: ['criticalPath', 'eureka', 'C1307979'] },
      () => {
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UsersCard.verifyUserRolesCounter(0);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(0);
        UserEdit.clickUserRolesAccordion();
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();

        UserEdit.searchRoleInModal(roleInfix);
        UserEdit.checkRolesCountInModal(testData.setOneRoleNames.length);
        UserEdit.checkRolesSelectedCounterInModal(0);
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });

        UserEdit.selectAllRolesInRolesModal();
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.length);

        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNames(testData.setOneRoleNames);
        UserEdit.verifyUserRolesRowsCount(testData.setOneRoleNames.length);

        UserEdit.saveAndClose();
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(testData.setOneRoleNames.length);
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames(testData.setOneRoleNames);
        UsersCard.verifyUserRolesRowsCount(testData.setOneRoleNames.length);

        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(testData.setOneRoleNames.length);
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRolesRowsCount(testData.setOneRoleNames.length);
        UserEdit.unassignAllRoles();
        UserEdit.verifyUserRolesAccordionEmpty();
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();
        assignFilterOptions.forEach((option) => {
          UserEdit.verifyRoleAssignmentFilterOptionInModal(option, { isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(0);

        UserEdit.selectRoleInModal(testData.anotherRoleName, true, { searchRole: false });
        UserEdit.checkRolesSelectedCounterInModal(1);
        UserEdit.searchRoleInModal(roleInfix);
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });

        UserEdit.selectAllRolesInRolesModal();
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.length + 1);

        UserEdit.saveAndCloseRolesModal();
        UserEdit.verifyUserRoleNames([...testData.setOneRoleNames, testData.anotherRoleName]);
        UserEdit.verifyUserRolesRowsCount(testData.setOneRoleNames.length + 1);

        UserEdit.saveAndClose();
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(testData.setOneRoleNames.length + 1);
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([...testData.setOneRoleNames, testData.anotherRoleName]);
        UsersCard.verifyUserRolesRowsCount(testData.setOneRoleNames.length + 1);
      },
    );
  });
});
