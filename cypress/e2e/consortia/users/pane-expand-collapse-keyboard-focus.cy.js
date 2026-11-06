import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Consortia', () => {
  describe('Users', () => {
    describe('Pane Expand/Collapse keyboard focus', () => {
      let user;

      // Moves focus to "Collapse Search & filter pane" with Tab and collapses the pane with Enter
      const collapseSearchPaneWithEnter = () => {
        UsersSearchPane.tabToCollapseSearchPaneButton();
        UsersSearchPane.pressKeyOnFocusedPaneButton('Enter');
        UsersSearchPane.verifySearchPaneCollapsed();
        UsersSearchPane.verifyExpandSearchPaneButtonFocused();
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiUsersView.gui]).then((userProperties) => {
          user = userProperties;
        });
      });

      beforeEach('Log in to the central tenant and open the "Users" app', () => {
        cy.login(user.username, user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        UsersSearchPane.verifySearchPaneExpanded();
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1464333 - Focus remains on the Expand/Collapse pane button after collapsing a pane using the keyboard (helios)',
        { tags: ['smokeECS', 'helios', 'C1464333'] },
        () => {
          // Step 2: Move focus to the "Collapse pane" button with Tab
          UsersSearchPane.tabToCollapseSearchPaneButton();

          // Step 3: Press Enter; the pane collapses and focus moves to the "Expand pane" button
          UsersSearchPane.pressKeyOnFocusedPaneButton('Enter');
          UsersSearchPane.verifySearchPaneCollapsed();
          UsersSearchPane.verifyExpandSearchPaneButtonFocused();
        },
      );

      it(
        'C1464334 - Focus remains on the Expand/Collapse pane button after re-expanding a collapsed pane using the keyboard (helios)',
        { tags: ['smokeECS', 'helios', 'C1464334'] },
        () => {
          // Precondition: the pane is collapsed with the keyboard and "Expand pane" has focus
          collapseSearchPaneWithEnter();

          // Step 1: Press Enter; the pane expands and focus moves to the "Collapse pane" button
          UsersSearchPane.pressKeyOnFocusedPaneButton('Enter');
          UsersSearchPane.verifySearchPaneExpanded();
          UsersSearchPane.verifyCollapseSearchPaneButtonFocused();
        },
      );

      it(
        'C1464335 - Expand/Collapse pane button toggles with both Enter and Space keys while retaining focus (helios)',
        { tags: ['criticalPathECS', 'helios', 'C1464335'] },
        () => {
          // Step 1: Move focus to the "Collapse pane" button with Tab
          UsersSearchPane.tabToCollapseSearchPaneButton();

          // Step 2: Press Space; the pane collapses, focus stays on the Expand/Collapse button
          UsersSearchPane.pressKeyOnFocusedPaneButton('Space');
          UsersSearchPane.verifySearchPaneCollapsed();
          UsersSearchPane.verifyExpandSearchPaneButtonFocused();

          // Step 3: Press Space again; the pane expands, focus stays on the Expand/Collapse button
          UsersSearchPane.pressKeyOnFocusedPaneButton('Space');
          UsersSearchPane.verifySearchPaneExpanded();
          UsersSearchPane.verifyCollapseSearchPaneButtonFocused();

          // Step 4: Press Enter; the pane collapses, focus stays on the Expand/Collapse button
          UsersSearchPane.pressKeyOnFocusedPaneButton('Enter');
          UsersSearchPane.verifySearchPaneCollapsed();
          UsersSearchPane.verifyExpandSearchPaneButtonFocused();
        },
      );

      it(
        'C1464336 - Tab order after collapsing a pane by keyboard moves forward and does not jump to "Skip to main content" (helios)',
        { tags: ['criticalPathECS', 'helios', 'C1464336'] },
        () => {
          // Steps 1-2: Move focus to the "Collapse pane" button with Tab and collapse the pane with Enter
          collapseSearchPaneWithEnter();

          // Step 3: Press Tab; focus moves forward to the next control in DOM order,
          // the "Actions" button in the "User search results" pane header
          UsersSearchPane.pressTab();
          UsersSearchPane.verifyResultsPaneActionsButtonFocused();
        },
      );
    });
  });
});
