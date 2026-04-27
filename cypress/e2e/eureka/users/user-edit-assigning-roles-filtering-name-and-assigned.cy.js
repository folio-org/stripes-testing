import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    const randomLetters = getRandomLetters(10);
    const setOneInfix = `${randomLetters}setOne`;
    const setTwoInfix = `${randomLetters}setTwo`;
    const randomPostfix = getRandomPostfix();
    const assignFilterOptions = UserEdit.roleAssignmentFilterOptions;
    const testData = {
      setOneRoleNames: [
        `AT_C1307987_${setOneInfix}_${randomPostfix}_A`,
        `AT_C1307987_${setOneInfix}_${randomPostfix}_B`,
        `AT_C1307987_${setOneInfix}_${randomPostfix}_C`,
      ],
      setTwoRoleNames: [
        `AT_C1307987_${setTwoInfix}_${randomPostfix}_A`,
        `AT_C1307987_${setTwoInfix}_${randomPostfix}_B`,
        `AT_C1307987_${setTwoInfix}_${randomPostfix}_C`,
      ],
      additionalRoleName: `AT_C1307987_UserRole_${randomPostfix}_Additional`,
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
        cy.createTempUser([]).then((createdUserBProperties) => {
          testData.userB = createdUserBProperties;
        });
        cy.createTempUser([]).then((createdUserCProperties) => {
          testData.userC = createdUserCProperties;
        });
        [
          ...testData.setOneRoleNames,
          ...testData.setTwoRoleNames,
          testData.additionalRoleName,
        ].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((createdRole) => {
            createdRoleIds.push(createdRole.id);
          });
        });
      })
        .then(() => {
          // Assign first setTwo role to userB (1 "Circulation" role)
          const userBRoleId = createdRoleIds[testData.setOneRoleNames.length];
          cy.updateRolesForUserApi(testData.userB.userId, [userBRoleId]);

          // Assign first setTwo role + additional role to userC (1 "Circulation" + 1 other role)
          const userCSetTwoRoleId = createdRoleIds[testData.setOneRoleNames.length];
          const userCAdditionalRoleId = createdRoleIds.at(-1);
          cy.updateRolesForUserApi(testData.userC.userId, [
            userCSetTwoRoleId,
            userCAdditionalRoleId,
          ]);
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
      Users.deleteViaApi(testData.userB.userId);
      Users.deleteViaApi(testData.userC.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C1307987 Using name and assigned status filtering during role assignment for a user (eureka)',
      { tags: ['criticalPath', 'eureka', 'C1307987'] },
      () => {
        // Preconditions: User A without roles
        // User A edit page is opened > User roles accordion is expanded
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UsersCard.verifyUserRolesCounter(0);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(0);
        UserEdit.clickUserRolesAccordion();

        // Step 1: Click Add user role button
        UserEdit.clickAddUserRolesButton();
        // Expected: "Select user roles" modal is opened with no roles selected and no filters applied
        UserEdit.verifySelectRolesModal();
        Object.values(assignFilterOptions).forEach((option) => {
          UserEdit.verifyRoleAssignmentFilterOptionInModal(option, { isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(0);

        // Step 2: In the "Search & Filter" search line input any name that will give more than 1 result (e.g Acquisition) > Search
        UserEdit.searchRoleInModal(setOneInfix);
        // Expected: All roles that contain "Acquisition" are shown
        UserEdit.checkRolesCountInModal(testData.setOneRoleNames.length);
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });

        // Step 3: In "Role assigned status" accordion select "Assigned" option
        // Expected: Option is selected, the list becomes empty
        UserEdit.selectRoleAssignmentFilterOptionInModal(assignFilterOptions.ASSIGNED);
        UserEdit.checkRolesCountInModal(0);

        // Step 4: Click "Save & close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's A edit page
        // User roles accordion is opened with no roles in it
        UserEdit.verifyUserRolesAccordionEmpty();

        // Step 5: Close edit user modal > search for user B > Edit it > Expand "User roles" accordion > Click "Add user roles" button
        UserEdit.clickCloseWithoutSavingIfModalExists();
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(0);
        cy.wait(3000);
        UsersSearchPane.searchByUsername(testData.userB.username);
        UsersSearchPane.selectUserFromList(testData.userB.username);
        UsersCard.verifyUserRolesCounter(1);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(1);
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRoleNames([testData.setTwoRoleNames[0]]);
        UserEdit.verifyUserRolesRowsCount(1);
        UserEdit.clickAddUserRolesButton();
        // Expected: "Select user roles" modal is opened with the role from precondition selected but with no filters applied
        // The counter on the bottom of the modal shows 1 (role from precondition)
        UserEdit.verifySelectRolesModal();
        Object.values(assignFilterOptions).forEach((option) => {
          UserEdit.verifyRoleAssignmentFilterOptionInModal(option, { isChecked: false });
        });
        UserEdit.verifyRoleInModal(testData.setTwoRoleNames[0], { isShown: true, isChecked: true });
        UserEdit.checkRolesSelectedCounterInModal(1);

        // Step 6: In the "Search & Filter" search line input any name that will give more than 1 result (e.g Circulation) > Search
        UserEdit.searchRoleInModal(setTwoInfix);
        // Expected: All roles that contain "Circulation" are shown, the one from precondition is selected
        // The counter on the bottom of the modal shows 1 (role from precondition)
        UserEdit.checkRolesCountInModal(testData.setTwoRoleNames.length);
        UserEdit.verifyRoleInModal(testData.setTwoRoleNames[0], { isShown: true, isChecked: true });
        testData.setTwoRoleNames.slice(1).forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(1);

        // Step 7: In "Role assigned status" accordion select "Assigned" option
        // Expected: Option is selected
        UserEdit.selectRoleAssignmentFilterOptionInModal(assignFilterOptions.ASSIGNED);
        // The role from precondition stays, the rest disappear
        // The counter on the bottom of the modal still shows 1 (role from precondition)
        UserEdit.checkRolesCountInModal(1);
        UserEdit.verifyRoleInModal(testData.setTwoRoleNames[0], { isShown: true, isChecked: true });
        testData.setTwoRoleNames.slice(1).forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(1);

        // Step 8: Click on "Un/Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal({ isChecked: null });
        // Expected: Selected in precondition role disappears, the list is empty
        // The counter on the bottom of the modal shows 0
        UserEdit.verifyRoleInModal(testData.setTwoRoleNames[0], { isShown: false });
        UserEdit.checkRolesSelectedCounterInModal(0);

        // Step 9: Click "Save & close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's B edit page
        // User roles accordion is opened with no roles in it
        UserEdit.verifyUserRolesAccordionEmpty();

        // Step 10: Click "Save & close" button
        UserEdit.saveAndClose();
        // Expected: User Edit page is closed
        // You are on the "Users" page with user details opened in the 3rd pane
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(0);

        // Step 11: Expand User roles accordion
        UsersCard.clickUserRolesAccordion();
        // Expected: No user roles found
        UsersCard.verifyUserRolesAccordionEmpty();
        cy.wait(3000);

        // Step 12: Search for user C > Edit it > Expand "User roles" accordion > Click "Add user roles" button
        UsersSearchPane.searchByUsername(testData.userC.username);
        UsersSearchPane.selectUserFromList(testData.userC.username);
        UsersCard.verifyUserRolesCounter(2);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(2);
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRoleNames([testData.setTwoRoleNames[0], testData.additionalRoleName]);
        UserEdit.verifyUserRolesRowsCount(2);
        UserEdit.clickAddUserRolesButton();
        // Expected: "Select user roles" modal is opened with the roles from precondition selected but with no filters applied
        // The counter on the bottom of the modal shows 2 (roles from precondition)
        UserEdit.verifySelectRolesModal();
        Object.values(assignFilterOptions).forEach((option) => {
          UserEdit.verifyRoleAssignmentFilterOptionInModal(option, { isChecked: false });
        });
        UserEdit.verifyRoleInModal(testData.setTwoRoleNames[0], { isShown: true, isChecked: true });
        UserEdit.verifyRoleInModal(testData.additionalRoleName, { isShown: true, isChecked: true });
        UserEdit.checkRolesSelectedCounterInModal(2);

        // Step 13: In the "Search & Filter" search line input any name that will give more than 1 result (e.g Circulation) > Search
        UserEdit.searchRoleInModal(setTwoInfix);
        // Expected: All roles that contain "Circulation" are shown, the one from precondition is selected
        // The counter on the bottom of the modal shows 2 (roles from precondition)
        UserEdit.checkRolesCountInModal(testData.setTwoRoleNames.length);
        UserEdit.verifyRoleInModal(testData.setTwoRoleNames[0], { isShown: true, isChecked: true });
        testData.setTwoRoleNames.slice(1).forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(2);

        // Step 14: In "Role assigned status" accordion select "Assigned" option
        // Expected: Option is selected
        UserEdit.selectRoleAssignmentFilterOptionInModal(assignFilterOptions.ASSIGNED);
        // The "Circulation" role from precondition stays, the rest disappear
        // The counter on the bottom of the modal shows 2 (Roles from precondition)
        UserEdit.checkRolesCountInModal(1);
        UserEdit.verifyRoleInModal(testData.setTwoRoleNames[0], { isShown: true, isChecked: true });
        testData.setTwoRoleNames.slice(1).forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(2);

        // Step 15: Click on "Un/Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal({ isChecked: null });
        // Expected: Selected in precondition role disappears, list is empty
        // The counter on the bottom on the modal shows 1 (additional role from precondition)
        UserEdit.verifyRoleInModal(testData.setTwoRoleNames[0], { isShown: false });
        UserEdit.checkRolesSelectedCounterInModal(1);

        // Step 16: Click "Save & Close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's C edit page
        // User roles accordion is opened with only additional role there
        UserEdit.verifyUserRoleNames([testData.additionalRoleName]);
        UserEdit.verifyUserRolesRowsCount(1);

        // Step 17: Click "Save & close" button
        UserEdit.saveAndClose();
        // Expected: User Edit page is closed
        // You are on the "Users" page with user details opened in the 3rd pane
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(1);

        // Step 18: Expand User roles accordion
        UsersCard.clickUserRolesAccordion();
        // Expected: Only additional role there
        UsersCard.verifyUserRoleNames([testData.additionalRoleName]);
        UsersCard.verifyUserRolesRowsCount(1);
      },
    );
  });
});
