import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    const randomPostfix = getRandomPostfix();
    const roleAName = `AT_C1554382_UserRoleA_${randomPostfix}`;
    const roleBName = `AT_C1554382_UserRoleB_${randomPostfix}`;
    const selectionFilterOptions = UserEdit.roleSelectionFilterOptions;
    const assignmentFilterOptions = UserEdit.roleAssignmentFilterOptions;
    const testData = {};
    const createdRoleIds = [];

    before('Create users, roles', () => {
      cy.then(() => {
        cy.getAdminToken();
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.tempUser = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.tempUser.userId,
            [],
            [CapabilitySets.uiUsersRolesManage, CapabilitySets.uiUsersEdit],
          );
        });
        cy.createTempUser([]).then((createdTestUserProperties) => {
          testData.testUser = createdTestUserProperties;
        });
        [roleAName, roleBName].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((createdRole) => {
            createdRoleIds.push(createdRole.id);
          });
        });
      }).then(() => {
        cy.login(testData.tempUser.username, testData.tempUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
        UsersSearchPane.searchByUsername(testData.testUser.username);
      });
    });

    after('Delete roles, users', () => {
      cy.getAdminToken(false);
      createdRoleIds.forEach((roleId) => {
        cy.deleteAuthorizationRoleApi(roleId);
      });
      Users.deleteViaApi(testData.testUser.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C1554382 Filter User roles in "Select user roles" modal by Selection status (eureka)',
      { tags: ['extendedPath', 'eureka', 'C1554382'] },
      () => {
        // Preconditions: Test user without roles; its Edit page is opened with "User roles"
        // accordion expanded
        UsersSearchPane.selectUserFromList(testData.testUser.username);
        UsersCard.verifyUserRolesCounter(0);
        UserEdit.openEdit();
        UserEdit.verifyUserRolesCounter(0);
        UserEdit.clickUserRolesAccordion();

        // Step 1: Click "Add user role" button
        UserEdit.clickAddUserRolesButton();
        // Expected: modal opens, both facets shown with no options checked
        UserEdit.verifySelectRolesModal();
        Object.values(selectionFilterOptions).forEach((option) => {
          UserEdit.verifyRoleSelectionFilterOptionInModal(option, { isChecked: false });
        });
        Object.values(assignmentFilterOptions).forEach((option) => {
          UserEdit.verifyRoleAssignmentFilterOptionInModal(option, { isChecked: false });
        });

        // Step 2: Click the "Selection status" facet header twice
        // Expected: collapses, then expands
        UserEdit.toggleRoleSelectionFilterAccordion(false);
        UserEdit.toggleRoleSelectionFilterAccordion(true);

        // Step 3: Select "Selected" option
        // Expected: no results (nothing has been checked yet in this session)
        UserEdit.selectRoleSelectionFilterOptionInModal(selectionFilterOptions.ASSIGNED);
        UserEdit.verifyRolesFoundCountInModal(0);

        // Step 4: Uncheck "Selected", check Role A's checkbox, check "Selected" again
        // Expected: exactly one role (Role A) is shown, still "Unassigned" (not saved yet)
        UserEdit.selectRoleSelectionFilterOptionInModal(selectionFilterOptions.ASSIGNED, {
          isChecked: false,
        });
        UserEdit.selectRoleInModal(roleAName, true, { searchRole: false });
        UserEdit.selectRoleSelectionFilterOptionInModal(selectionFilterOptions.ASSIGNED, {
          isChecked: true,
        });
        UserEdit.verifyRolesFoundCountInModal(1);
        UserEdit.verifyRoleInModal(roleAName, { isShown: true, isChecked: true });
        UserEdit.verifyRoleStatusInModal(roleAName, assignmentFilterOptions.UNASSIGNED);

        // Step 5: Also check "Unselected"
        // Expected: all roles are returned, both selected and unselected
        UserEdit.selectRoleSelectionFilterOptionInModal(selectionFilterOptions.UNASSIGNED, {
          isChecked: true,
        });
        UserEdit.verifyRolesFoundCountInModal();
        UserEdit.verifyRoleInModal(roleAName, { isShown: true, isChecked: true });
        UserEdit.verifyRoleInModal(roleBName, { isShown: true, isChecked: false });

        // Step 6: Click the "x" icon next to the "Selection status" filter
        // Expected: filter resets (both options unchecked), all roles still shown
        UserEdit.resetRoleSelectionFilterInModal();
        UserEdit.verifyRolesFoundCountInModal();
        UserEdit.verifyRoleInModal(roleAName, { isShown: true, isChecked: true });
        UserEdit.verifyRoleInModal(roleBName, { isShown: true, isChecked: false });

        // Step 7: Check "Assigned" in "Role assigment status" filter
        // Expected: no results (nothing has been saved/assigned yet)
        UserEdit.selectRoleAssignmentFilterOptionInModal(assignmentFilterOptions.ASSIGNED);
        UserEdit.verifyRolesFoundCountInModal(0);

        // Step 8: Uncheck "Assigned", check "Unassigned"
        // Expected: all roles are returned, both selected and unselected
        UserEdit.selectRoleAssignmentFilterOptionInModal(assignmentFilterOptions.ASSIGNED, {
          isChecked: false,
        });
        UserEdit.selectRoleAssignmentFilterOptionInModal(assignmentFilterOptions.UNASSIGNED);
        UserEdit.verifyRolesFoundCountInModal();
        UserEdit.verifyRoleInModal(roleAName, { isShown: true, isChecked: true });
        UserEdit.verifyRoleInModal(roleBName, { isShown: true, isChecked: false });

        // Step 9: With "Unassigned" still selected, also check "Selected"
        // Expected: only Role A is returned (the only role checked in this session)
        UserEdit.selectRoleSelectionFilterOptionInModal(selectionFilterOptions.ASSIGNED, {
          isChecked: true,
        });
        UserEdit.verifyRolesFoundCountInModal(1);
        UserEdit.verifyRoleInModal(roleAName, { isShown: true, isChecked: true });
        UserEdit.verifyRoleInModal(roleBName, { isShown: false });

        // Step 10: Click "Reset all", select Role B as well, then "Save & close"
        UserEdit.clickResetAllInRolesModal();
        UserEdit.selectRoleInModal(roleBName, true, { searchRole: false });
        UserEdit.saveAndCloseRolesModal();
        // Expected: both roles selected in steps 4 and 10 appear under "User roles" accordion
        UserEdit.verifyUserRoleNames([roleAName, roleBName]);
        UserEdit.verifyUserRolesRowsCount(2);

        // Step 11: Click "Add user role" again
        UserEdit.clickAddUserRolesButton();
        // Expected: both roles show "Assigned" status and checked checkboxes
        UserEdit.verifyRoleInModal(roleAName, { isShown: true, isChecked: true });
        UserEdit.verifyRoleStatusInModal(roleAName, assignmentFilterOptions.ASSIGNED);
        UserEdit.verifyRoleInModal(roleBName, { isShown: true, isChecked: true });
        UserEdit.verifyRoleStatusInModal(roleBName, assignmentFilterOptions.ASSIGNED);

        // Step 12: Uncheck Role A's checkbox
        // Expected: unchecked, but "Status" column still shows "Assigned" (not saved yet)
        UserEdit.selectRoleInModal(roleAName, false, { searchRole: false });
        UserEdit.verifyRoleStatusInModal(roleAName, assignmentFilterOptions.ASSIGNED);

        // Step 13: Select "Selected" option in "Selection status" facet
        // Expected: only Role B is returned (the only role still checked)
        UserEdit.selectRoleSelectionFilterOptionInModal(selectionFilterOptions.ASSIGNED, {
          isChecked: true,
        });
        UserEdit.verifyRolesFoundCountInModal(1);
        UserEdit.verifyRoleInModal(roleBName, { isShown: true, isChecked: true });
        UserEdit.verifyRoleInModal(roleAName, { isShown: false });

        // Step 14: Uncheck "Selected", check "Unselected"
        // Expected: all roles except Role B are returned; Role A is present, still "Assigned"
        UserEdit.selectRoleSelectionFilterOptionInModal(selectionFilterOptions.ASSIGNED, {
          isChecked: false,
        });
        UserEdit.selectRoleSelectionFilterOptionInModal(selectionFilterOptions.UNASSIGNED, {
          isChecked: true,
        });
        UserEdit.verifyRoleInModal(roleBName, { isShown: false });
        UserEdit.verifyRoleInModal(roleAName, { isShown: true, isChecked: false });
        UserEdit.verifyRoleStatusInModal(roleAName, assignmentFilterOptions.ASSIGNED);

        // Step 15: Check "Assigned" in "Role assigment status" facet
        // Expected: only Role A is returned
        UserEdit.selectRoleAssignmentFilterOptionInModal(assignmentFilterOptions.ASSIGNED);
        UserEdit.verifyRolesFoundCountInModal(1);
        UserEdit.verifyRoleInModal(roleAName, { isShown: true });
        UserEdit.verifyRoleInModal(roleBName, { isShown: false });

        // Step 16: Click "Save & close"
        UserEdit.saveAndCloseRolesModal();
        // Expected: Role A is no longer in the "User roles" accordion, only Role B remains
        UserEdit.verifyUserRoleNames([roleBName]);
        UserEdit.verifyUserRolesRowsCount(1);

        // Step 17: Click "Add user role" again
        UserEdit.clickAddUserRolesButton();
        // Expected: both facets still show their last-applied options ("Assigned" / "Unselected"),
        // and the pane shows no results (Role A is no longer Assigned, Role B is no longer
        // Unselected since it's now checked), confirming the filters persisted across reopens
        UserEdit.verifyRoleAssignmentFilterOptionInModal(assignmentFilterOptions.ASSIGNED, {
          isChecked: true,
        });
        UserEdit.verifyRoleSelectionFilterOptionInModal(selectionFilterOptions.UNASSIGNED, {
          isChecked: true,
        });
        UserEdit.verifyRolesFoundCountInModal(0);
      },
    );
  });
});
