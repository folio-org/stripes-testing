import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    const roleInfix = `setOne${getRandomLetters(10)}`;
    const randomPostfix = getRandomPostfix();
    const assignFilterOptions = Object.values(UserEdit.roleAssignmentFilterOptions);
    const testData = {
      initialRoleName: `AT_C1307982_UserRole_${randomPostfix}_Initial`,
      setOneRoleNames: [
        `AT_C1307982_${roleInfix}_${randomPostfix}_A`,
        `AT_C1307982_${roleInfix}_${randomPostfix}_B`,
        `AT_C1307982_${roleInfix}_${randomPostfix}_C`,
      ],
      dataImportRoleName: `AT_C1307982_UserRole_${randomPostfix}_D`,
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
        [
          testData.initialRoleName,
          ...testData.setOneRoleNames,
          testData.dataImportRoleName,
        ].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((createdRole) => {
            createdRoleIds.push(createdRole.id);
          });
        });
      })
        .then(() => {
          // Assign initial role to userA
          const initialRoleId = createdRoleIds[0];
          cy.updateRolesForUserApi(testData.userA.userId, [initialRoleId]);
        })
        .then(() => {
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
      'C1307982 Using filtering and select all function during role assignment for user that already have assigned roles (eureka)',
      { tags: ['criticalPath', 'eureka', 'C1307982'] },
      () => {
        // Preconditions verification: User A has 1 role assigned
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UsersCard.verifyUserRolesCounter(1);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(1);
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRoleNames([testData.initialRoleName]);
        UserEdit.verifyUserRolesRowsCount(1);

        // Step 1: Click Add user role button
        UserEdit.clickAddUserRolesButton();
        // Expected: "Select user roles" modal is opened with the role from precondition selected but with no filters applied
        UserEdit.verifySelectRolesModal();
        assignFilterOptions.forEach((option) => {
          UserEdit.verifyRoleAssignmentFilterOptionInModal(option, { isChecked: false });
        });
        UserEdit.verifyRoleInModal(testData.initialRoleName, { isShown: true, isChecked: true });
        UserEdit.checkRolesSelectedCounterInModal(1);

        // Step 2: In the "Search & Filter" search line input any name that will give more than 1 result (e.g Acquisition) > Search
        UserEdit.searchRoleInModal(roleInfix);
        // Expected: All roles that contain "Acquisition" are shown
        UserEdit.checkRolesCountInModal(testData.setOneRoleNames.length);
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });

        // Step 3: Click on "Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal();
        // Expected: All "Acquisition" roles are selected
        // The counter on the bottom of the modal shows equal number of selected roles + 1 for the role selected in precondition
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.length + 1);

        // Step 4: Click "Save & Close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's A edit page
        // User roles accordion is opened with only roles selected in precondition & step 3 are shown
        UserEdit.verifyUserRoleNames([testData.initialRoleName, ...testData.setOneRoleNames]);
        UserEdit.verifyUserRolesRowsCount(testData.setOneRoleNames.length + 1);

        // Step 5: Click "Save & close" button
        UserEdit.saveAndClose();
        // Expected: User Edit page is closed
        // You are on the "Users" page with user details opened in the 3rd pane
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(testData.setOneRoleNames.length + 1);

        // Step 6: Expand User roles accordion
        UsersCard.clickUserRolesAccordion();
        // Expected: Only roles selected in precondition & step 3 are shown
        UsersCard.verifyUserRoleNames([testData.initialRoleName, ...testData.setOneRoleNames]);
        UsersCard.verifyUserRolesRowsCount(testData.setOneRoleNames.length + 1);

        // Step 7: Edit user > Expand "User roles" accordion > Remove all "Acquisition" roles, but leave the role from precondition > Click "Add user roles" button
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(testData.setOneRoleNames.length + 1);
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRolesRowsCount(testData.setOneRoleNames.length + 1);
        // Remove all "Acquisition" roles but keep the initial role
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.removeOneRole(roleName);
        });
        UserEdit.verifyUserRolesRowsCount(1);
        UserEdit.verifyUserRoleNames([testData.initialRoleName]);
        UserEdit.clickAddUserRolesButton();
        // Expected: "Select user roles" modal is opened with the role from precondition selected but with no filters applied
        UserEdit.verifySelectRolesModal();
        UserEdit.verifyRoleInModal(testData.initialRoleName, { isShown: true, isChecked: true });
        UserEdit.checkRolesSelectedCounterInModal(1);

        // Step 8: Select any role (e.g Data Import) > In the "Search & Filter" search line input any name that will give more than 1 result (e.g Acquisition) > Search
        UserEdit.selectRoleInModal(testData.dataImportRoleName, true, { searchRole: false });
        UserEdit.checkRolesSelectedCounterInModal(2);
        UserEdit.searchRoleInModal(roleInfix);
        // Expected: All roles that contain "Acquisition" are shown
        // The counter on the bottom of the modal shows 2 (role from precondition + recently selected role)
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(2);

        // Step 9: Click on "Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal();
        // Expected: All "Acquisition" roles are selected
        // The counter on the bottom of the modal shows equal number of selected roles + 2 for the role selected in previous step
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.length + 2);

        // Step 10: Click "Save & Close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's A edit page
        // User roles accordion is opened with only roles selected in step 8,9 and from precondition are shown
        UserEdit.verifyUserRoleNames([
          testData.initialRoleName,
          testData.dataImportRoleName,
          ...testData.setOneRoleNames,
        ]);
        UserEdit.verifyUserRolesRowsCount(testData.setOneRoleNames.length + 2);

        // Step 11: Click "Save & close" button
        UserEdit.saveAndClose();
        // Expected: User Edit page is closed
        // You are on the "Users" page with user details opened in the 3rd pane
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(testData.setOneRoleNames.length + 2);

        // Step 12: Expand User roles accordion
        UsersCard.clickUserRolesAccordion();
        // Expected: Only roles selected in step 8,9 and from precondition are shown
        UsersCard.verifyUserRoleNames([
          testData.initialRoleName,
          testData.dataImportRoleName,
          ...testData.setOneRoleNames,
        ]);
        UsersCard.verifyUserRolesRowsCount(testData.setOneRoleNames.length + 2);
      },
    );
  });
});
