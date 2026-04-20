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
    const setOneInfix = `setFirst${randomLetters}`;
    const setTwoInfix = `setSecond${randomLetters}`;
    const randomPostfix = getRandomPostfix();
    const assignFilterOptions = Object.values(UserEdit.roleAssignmentFilterOptions);
    const testData = {
      initialRoleName: `AT_C1307983_UserRole_${randomPostfix}_Initial`,
      setOneRoleNames: [
        `AT_C1307983_${setOneInfix}_${randomPostfix}_A`,
        `AT_C1307983_${setOneInfix}_${randomPostfix}_B`,
        `AT_C1307983_${setOneInfix}_${randomPostfix}_C`,
      ],
      setTwoRoleNames: [
        `AT_C1307983_${setTwoInfix}_${randomPostfix}_A`,
        `AT_C1307983_${setTwoInfix}_${randomPostfix}_B`,
        `AT_C1307983_${setTwoInfix}_${randomPostfix}_C`,
      ],
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
          testData.initialRoleName,
          ...testData.setOneRoleNames,
          ...testData.setTwoRoleNames,
        ].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((createdRole) => {
            createdRoleIds.push(createdRole.id);
          });
        });
      })
        .then(() => {
          // Assign initial role to userB
          const initialRoleId = createdRoleIds[0];
          cy.updateRolesForUserApi(testData.userB.userId, [initialRoleId]);
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
      'C1307983 Using name filtering twice during role assignment for a user (eureka)',
      { tags: ['criticalPath', 'eureka', 'C1307983'] },
      () => {
        // Preconditions: User A without roles, User B with 1 role
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
        assignFilterOptions.forEach((option) => {
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

        // Step 3: Click on "Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal();
        // Expected: All "Acquisition" roles are selected
        // The counter on the bottom of the modal shows equal number of selected roles
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.length);

        // Step 4: In the "Search & Filter" search line input any name that will give more than 1 result (e.g Circulation) > Search
        UserEdit.searchRoleInModal(setTwoInfix);
        // Expected: All "Circulation" roles are shown
        // The counter on the bottom of the modal shows equal number of selected roles + the number for the roles selected in previous step
        UserEdit.checkRolesCountInModal(testData.setTwoRoleNames.length);
        testData.setTwoRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        // Counter should still show acquisition roles count (they remain selected even though not visible)
        UserEdit.checkRolesSelectedCounterInModal(testData.setOneRoleNames.length);
        // Select all circulation roles (implicit step based on expected results)
        UserEdit.selectAllRolesInRolesModal();
        testData.setTwoRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(
          testData.setOneRoleNames.length + testData.setTwoRoleNames.length,
        );

        // Step 5: Click "Save & Close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's A edit page
        // User roles accordion is opened with only roles selected in step 3 and 4 are shown
        UserEdit.verifyUserRoleNames([...testData.setOneRoleNames, ...testData.setTwoRoleNames]);
        UserEdit.verifyUserRolesRowsCount(
          testData.setOneRoleNames.length + testData.setTwoRoleNames.length,
        );

        // Step 6: Click "Save & close" button
        UserEdit.saveAndClose();
        // Expected: User Edit page is closed
        // You are on the "Users" page with user details opened in the 3rd pane
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(
          testData.setOneRoleNames.length + testData.setTwoRoleNames.length,
        );

        // Step 7: Expand User roles accordion
        UsersCard.clickUserRolesAccordion();
        // Expected: Only roles selected in step 3 and 4 are shown
        UsersCard.verifyUserRoleNames([...testData.setOneRoleNames, ...testData.setTwoRoleNames]);
        UsersCard.verifyUserRolesRowsCount(
          testData.setOneRoleNames.length + testData.setTwoRoleNames.length,
        );

        // Step 8: Search for user B > Edit it > Expand "User roles" accordion > Click "Add user roles" button
        UsersSearchPane.searchByUsername(testData.userB.username);
        UsersSearchPane.selectUserFromList(testData.userB.username);
        UsersCard.verifyUserRolesCounter(1);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(1);
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRoleNames([testData.initialRoleName]);
        UserEdit.verifyUserRolesRowsCount(1);
        UserEdit.clickAddUserRolesButton();
        // Expected: "Select user roles" modal is opened with the role from precondition selected but with no filters applied
        // The counter on the bottom of the modal shows 1 (role from precondition)
        UserEdit.verifySelectRolesModal();
        UserEdit.verifyRoleInModal(testData.initialRoleName, { isShown: true, isChecked: true });
        UserEdit.checkRolesSelectedCounterInModal(1);

        // Step 9: In the "Search & Filter" search line input any name that will give more than 1 result (e.g Circulation) > Search
        UserEdit.searchRoleInModal(setTwoInfix);
        // Expected: All roles that contain "Circulation" are shown
        // The counter on the bottom of the modal shows 1 (role from precondition)
        UserEdit.checkRolesCountInModal(testData.setTwoRoleNames.length);
        testData.setTwoRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(1);

        // Step 10: Click on "Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal();
        // Expected: All "Circulation" roles are selected
        // The counter on the bottom of the modal shows equal number of selected roles + 1 (role from precondition)
        testData.setTwoRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setTwoRoleNames.length + 1);

        // Step 11: In the "Search & Filter" search line input any name that will give more than 1 result (e.g Acquisition) > Search
        UserEdit.searchRoleInModal(setOneInfix);
        // Expected: All "Acquisition" roles are shown
        // The counter on the bottom of the modal shows equal number of roles selected in previous step + 1 (role from precondition)
        UserEdit.checkRolesCountInModal(testData.setOneRoleNames.length);
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: false });
        });
        UserEdit.checkRolesSelectedCounterInModal(testData.setTwoRoleNames.length + 1);

        // Step 12: Click on "Select All" checkbox in the right part of the modal
        UserEdit.selectAllRolesInRolesModal();
        // Expected: All "Acquisition" roles are selected
        // The counter on the bottom of the modal shows equal number of selected roles + 1 (role from precondition) + Number of roles selected in step 10
        testData.setOneRoleNames.forEach((roleName) => {
          UserEdit.verifyRoleInModal(roleName, { isShown: true, isChecked: true });
        });
        UserEdit.checkRolesSelectedCounterInModal(
          testData.setOneRoleNames.length + testData.setTwoRoleNames.length + 1,
        );

        // Step 13: Click "Save & Close" button
        UserEdit.saveAndCloseRolesModal();
        // Expected: Modal closes
        // You are on the User's B edit page
        // User roles accordion is opened with only roles selected in steps 10,12 and from precondition are shown
        UserEdit.verifyUserRoleNames([
          testData.initialRoleName,
          ...testData.setTwoRoleNames,
          ...testData.setOneRoleNames,
        ]);
        UserEdit.verifyUserRolesRowsCount(
          testData.setOneRoleNames.length + testData.setTwoRoleNames.length + 1,
        );

        // Step 14: Click "Save & close" button
        UserEdit.saveAndClose();
        // Expected: User Edit page is closed
        // You are on the "Users" page with user details opened in the 3rd pane
        UsersCard.waitLoading();
        UsersCard.verifyUserRolesCounter(
          testData.setOneRoleNames.length + testData.setTwoRoleNames.length + 1,
        );

        // Step 15: Expand User roles accordion
        UsersCard.clickUserRolesAccordion();
        // Expected: Only roles selected in steps 10,12 and from precondition are shown
        UsersCard.verifyUserRoleNames([
          testData.initialRoleName,
          ...testData.setTwoRoleNames,
          ...testData.setOneRoleNames,
        ]);
        UsersCard.verifyUserRolesRowsCount(
          testData.setOneRoleNames.length + testData.setTwoRoleNames.length + 1,
        );
      },
    );
  });
});
