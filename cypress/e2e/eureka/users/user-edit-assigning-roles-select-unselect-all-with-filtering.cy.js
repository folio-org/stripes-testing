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
    const setOneInfix = `${randomLetters}setFirst`;
    const setTwoInfix = `${randomLetters}setSecond`;
    const randomPostfix = getRandomPostfix();
    const assignFilterOptions = UserEdit.roleAssignmentFilterOptions;
    const testData = {
      setOneRoleNames: [
        `AT_C1307988_${setOneInfix}_${randomPostfix}_A`,
        `AT_C1307988_${setOneInfix}_${randomPostfix}_B`,
        `AT_C1307988_${setOneInfix}_${randomPostfix}_C`,
      ],
      setTwoRoleNames: [
        `AT_C1307988_${setTwoInfix}_${randomPostfix}_A`,
        `AT_C1307988_${setTwoInfix}_${randomPostfix}_B`,
        `AT_C1307988_${setTwoInfix}_${randomPostfix}_C`,
      ],
      additionalRoleName: `AT_C1307988_UserRole_${randomPostfix}_Additional`,
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
          // User A: All setTwo roles + some setOne roles
          const userASetOneRoleIds = createdRoleIds.slice(0, 2); // First 2 setOne roles
          const userASetTwoRoleIds = createdRoleIds.slice(
            testData.setOneRoleNames.length,
            testData.setOneRoleNames.length + testData.setTwoRoleNames.length,
          );
          cy.updateRolesForUserApi(testData.userA.userId, [
            ...userASetOneRoleIds,
            ...userASetTwoRoleIds,
          ]);

          // User B: All setTwo  roles + some setOne roles + additional role
          const userBSetOneRoleIds = createdRoleIds.slice(0, 2); // First 2 setOne roles
          const userBSetTwoRoleIds = createdRoleIds.slice(
            testData.setOneRoleNames.length,
            testData.setOneRoleNames.length + testData.setTwoRoleNames.length,
          );
          const additionalRoleId = createdRoleIds.at(-1);
          cy.updateRolesForUserApi(testData.userB.userId, [
            ...userBSetOneRoleIds,
            ...userBSetTwoRoleIds,
            additionalRoleId,
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
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C1307988 Using select & unselect all combined with filtering by name during role assignment for a user with several roles (eureka)',
      { tags: ['criticalPath', 'eureka', 'C1307988'] },
      () => {
        // Preconditions: User A with all setTwo (Circulation) roles and some setOne (Acquisition) roles
        // User A edit page is opened > User roles accordion is expanded
        const userAInitialRoles = [
          ...testData.setOneRoleNames.slice(0, 2),
          ...testData.setTwoRoleNames,
        ];
        UsersSearchPane.selectUserFromList(testData.userA.username);
        UsersCard.verifyUserRolesCounter(userAInitialRoles.length);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(userAInitialRoles.length);
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRolesRowsCount(userAInitialRoles.length);

        // Step 1: Click "Add user roles" button
        UserEdit.clickAddUserRolesButton();
        // Expected: "Select user roles" modal is opened with the roles from precondition selected but with no filters applied
        // The counter on the bottom of the modal is equal to all roles selected in precondition
        UserEdit.verifySelectRolesModal();
        Object.values(assignFilterOptions).forEach((option) => {
          UserEdit.verifyRoleAssignmentFilterOptionInModal(option, { isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(userAInitialRoles.length);

        // Step 2: In the "Search & Filter" search line input Circulation > Search
        UserEdit.searchRoleInModal(setTwoInfix);
        // Expected: All roles that contain "Circulation" are shown, all of them are selected
        // The counter on the bottom of the modal shows the same number as in previous step
        UserEdit.checkRolesCountInModal(testData.setTwoRoleNames.length);
        testData.setTwoRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(userAInitialRoles.length);

        // Step 3: Click on "Un/Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal({ isChecked: false });
        // Expected: All "Circulation" roles are unselected
        // The number of unselected roles is excluded from the number of selected roles on the bottom of the modal
        testData.setTwoRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.slice(0, 2).length);

        // Step 4: In the "Search & Filter" search line input Acquisition > Search
        UserEdit.searchRoleInModal(setOneInfix);
        // Expected: All roles that contain "Acquisition" are shown, some of them are selected (in precondition)
        // The counter on the bottom of the modal shows the same number as in previous step
        UserEdit.checkRolesCountInModal(testData.setOneRoleNames.length);
        testData.setOneRoleNames.slice(0, 2).forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        testData.setOneRoleNames.slice(2).forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.slice(0, 2).length);

        // Step 5: Click on "Un/Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal();
        // Expected: All "Acquisition" roles are selected and shown
        // To the number of selected roles on the bottom of the modal is increased by the number of the recently selected roles
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.length);

        // Step 6: Click "Save & Close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's A edit page
        // User roles accordion is opened with only roles selected in step 5 are shown
        UserEdit.verifyUserRoleNames(testData.setOneRoleNames);
        UserEdit.verifyUserRolesRowsCount(testData.setOneRoleNames.length);

        // Step 7: Click "Save & close" button
        UserEdit.saveAndClose();
        // Expected: User Edit page is closed
        // You are on the "Users" page with user details opened in the 3rd pane
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(testData.setOneRoleNames.length);

        // Step 8: Expand User roles accordion
        UsersCard.clickUserRolesAccordion();
        // Expected: Only roles selected in step 5 are shown
        UsersCard.verifyUserRoleNames(testData.setOneRoleNames);
        UsersCard.verifyUserRolesRowsCount(testData.setOneRoleNames.length);

        // Step 9: Search for user B > Edit it > Expand "User roles" accordion > Click "Add user roles" button
        const userBInitialRoles = [
          ...testData.setOneRoleNames.slice(0, 2),
          ...testData.setTwoRoleNames,
          testData.additionalRoleName,
        ];
        UsersSearchPane.searchByUsername(testData.userB.username);
        UsersSearchPane.selectUserFromList(testData.userB.username);
        UsersCard.verifyUserRolesCounter(userBInitialRoles.length);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(userBInitialRoles.length);
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRolesRowsCount(userBInitialRoles.length);
        UserEdit.clickAddUserRolesButton();
        // Expected: "Select user roles" modal is opened with the roles from precondition selected and with no filters applied
        // The counter on the bottom of the modal is equal to all roles selected in precondition
        UserEdit.verifySelectRolesModal();
        Object.values(assignFilterOptions).forEach((option) => {
          UserEdit.verifyRoleAssignmentFilterOptionInModal(option, { isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(userBInitialRoles.length);

        // Step 10: In the "Search & Filter" search line input Circulation > Search
        UserEdit.searchRoleInModal(setTwoInfix);
        // Expected: All roles that contain "Circulation" are shown, all of them are selected
        // The counter on the bottom of the modal shows the same number as in previous step
        UserEdit.checkRolesCountInModal(testData.setTwoRoleNames.length);
        testData.setTwoRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(userBInitialRoles.length);

        // Step 11: In the "Search & Filter" search line input Acquisition > Search
        UserEdit.searchRoleInModal(setOneInfix);
        // Expected: All roles that contain "Acquisition" are shown, some of them are selected
        // The counter on the bottom of the modal shows the same number as in previous step
        UserEdit.checkRolesCountInModal(testData.setOneRoleNames.length);
        testData.setOneRoleNames.slice(0, 2).forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        testData.setOneRoleNames.slice(2).forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(userBInitialRoles.length);

        // Step 12: Click on "Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal();
        // Expected: All "Acquisition" roles are selected and displayed
        // To the number of selected roles on the bottom of the modal is increased by the number of the recently selected roles
        const userBFinalRoles = [
          ...testData.setOneRoleNames,
          ...testData.setTwoRoleNames,
          testData.additionalRoleName,
        ];
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(userBFinalRoles.length);

        // Step 13: Click "Save & Close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's B edit page
        // User roles accordion is opened with only roles selected in step 12 and from precondition (additional + all Circulation roles)
        UserEdit.verifyUserRoleNames(userBFinalRoles);
        UserEdit.verifyUserRolesRowsCount(userBFinalRoles.length);

        // Step 14: Click "Save & close" button
        UserEdit.saveAndClose();
        // Expected: User Edit page is closed
        // You are on the "Users" page with user details opened in the 3rd pane
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(userBFinalRoles.length);

        // Step 15: Expand User roles accordion
        UsersCard.clickUserRolesAccordion();
        // Expected: All Acquisition and Circulation roles are shown + additional role from precondition
        UsersCard.verifyUserRoleNames(userBFinalRoles);
        UsersCard.verifyUserRolesRowsCount(userBFinalRoles.length);
      },
    );
  });
});
