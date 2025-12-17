import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportViewAllLogs from '../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../support/fragments/data-export/exportFile';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

let testUser;
const users = [];
const fileName = 'empty.csv';
const nonExistentUserName = 'NonExistent';

describe('Data Export', () => {
  before('Create test data', () => {
    for (let i = 0; i < 12; i++) {
      cy.createTempUser([permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
        (userProperties) => {
          users.push(userProperties);

          cy.getUserToken(userProperties.username, userProperties.password);
          ExportFile.exportFileViaApi(fileName, 'instance', 'Default instances export job profile');
        },
      );
    }

    cy.createTempUser([permissions.dataExportViewOnly.gui, permissions.uiUsersView.gui]).then(
      (userProperties) => {
        testUser = userProperties;

        cy.login(testUser.username, testUser.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    users.forEach((user) => {
      Users.deleteViaApi(user.userId);
    });
    Users.deleteViaApi(testUser.userId);
  });

  it(
    'C446043 Verify filtering by User in the "Search & filter" pane on the "View all" screen ("Choose user" dropdown) (firebird)',
    { tags: ['extendedPath', 'firebird', 'C446043'] },
    () => {
      // Step 1: Click "View all" button in the "Logs" main pane
      DataExportViewAllLogs.openAllJobLogs();
      DataExportViewAllLogs.verifySearchAndFilterPane();
      DataExportViewAllLogs.verifyIDOption();
      DataExportViewAllLogs.verifyRecordSearch();
      DataExportViewAllLogs.verifySearchButton();
      DataExportViewAllLogs.verifySearchButtonIsDisabled();
      DataExportViewAllLogs.verifyResetAllButton();
      DataExportViewAllLogs.verifyResetAllIsDisabled();
      DataExportViewAllLogs.verifyErrorsInExportAccordion();
      DataExportViewAllLogs.verifyErrorsAccordionIsExpanded();
      DataExportViewAllLogs.verifyStartedRunningAccordion();
      DataExportViewAllLogs.verifyStartedRunningIsCollapsed();
      DataExportViewAllLogs.verifyEndedRunningAccordion();
      DataExportViewAllLogs.verifyEndedRunningIsCollapsed();
      DataExportViewAllLogs.verifyJobProfileAccordion();
      DataExportViewAllLogs.verifyJobProfileIsCollapsed();
      DataExportViewAllLogs.verifyUserAccordionIsCollapsed();
      DataExportViewAllLogs.verifyLogsMainPane();
      DataExportViewAllLogs.verifyLogsIcon();
      DataExportViewAllLogs.verifyRecordsFoundText();
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyPaginatorExists();

      // Step 2: Click "User" accordion in "Search & filter" pane
      DataExportViewAllLogs.expandUserAccordion();
      DataExportViewAllLogs.verifyUserAccordionExpanded();
      DataExportViewAllLogs.verifyUserDropdownExists();

      // Step 3: Click "Choose user" dropdown under "User" accordion
      DataExportViewAllLogs.clickUserDropdown();
      DataExportViewAllLogs.verifyUsersInAlphabeticalOrder();
      DataExportViewAllLogs.verifyUserListScrollable();

      // Step 4: Click on the "Search box" and start typing a name of any user who executed jobs
      const firstUser = users[0];

      DataExportViewAllLogs.filterUserByName(firstUser.username);
      DataExportViewAllLogs.verifyUserHighlightedInList(
        firstUser.personal.firstName,
        firstUser.personal.lastName,
      );

      // Step 5: Type a name of any user who executed jobs => Click "Enter" on the keyboard
      DataExportViewAllLogs.selectUserByEnter();
      DataExportViewAllLogs.verifyClearUserFilterButtonExists();
      DataExportViewAllLogs.verifyResetAllButtonEnabled();
      DataExportViewAllLogs.verifyUserFilterSelected(
        firstUser.personal.firstName,
        firstUser.personal.lastName,
      );
      DataExportViewAllLogs.verifyLogsFilteredByUser(firstUser.username);
      DataExportViewAllLogs.verifyFoundRecordsCount(1);

      // Step 6: Click on dropdown => Type a name of any other user who executed jobs => Click "Enter" on the keyboard
      DataExportViewAllLogs.clickUserDropdown();

      const secondUser = users[1];

      DataExportViewAllLogs.filterUserByName(secondUser.username);
      DataExportViewAllLogs.selectUserByEnter();
      DataExportViewAllLogs.verifyClearUserFilterButtonExists();
      DataExportViewAllLogs.verifyResetAllButtonEnabled();
      DataExportViewAllLogs.verifyLogsFilteredByUser(secondUser.username);
      DataExportViewAllLogs.verifyFoundRecordsCount(1);

      // Step 7: Click on "x" next to "User" filter
      DataExportViewAllLogs.clickClearUserFilter();
      DataExportViewAllLogs.verifyClearUserFilterButtonExists(false);
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyLogsFilteredByUser(firstUser.username);
      DataExportViewAllLogs.verifyLogsFilteredByUser(secondUser.username);
      DataExportViewAllLogs.verifyResetAllIsDisabled();

      // Step 8: Click on the dropdown under the "User" filter on the "Set criteria" left side pane => Select from the list any name of user who executed jobs
      DataExportViewAllLogs.clickUserDropdown();

      const thirdUser = users[2];

      DataExportViewAllLogs.selectFilterOption(thirdUser.username);
      DataExportViewAllLogs.verifyClearUserFilterButtonExists();
      DataExportViewAllLogs.verifyResetAllButtonEnabled();
      DataExportViewAllLogs.verifyLogsFilteredByUser(thirdUser.username);
      DataExportViewAllLogs.verifyFoundRecordsCount(1);

      // Step 9: Click "Reset all" button
      DataExportViewAllLogs.resetAll();
      DataExportViewAllLogs.verifyUserDropdownExists();
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyLogsFilteredByUser(firstUser.username);
      DataExportViewAllLogs.verifyLogsFilteredByUser(secondUser.username);
      DataExportViewAllLogs.verifyLogsFilteredByUser(thirdUser.username);
      DataExportViewAllLogs.verifyResetAllIsDisabled();

      // Step 10: Click dropdown under "User" accordion => Click on the "Search box" and start typing a name of any user who "Did NOT" execute jobs
      DataExportViewAllLogs.clickUserDropdown();
      DataExportViewAllLogs.filterUserByName(nonExistentUserName);
      DataExportViewAllLogs.verifyValueNotInList();

      // Step 11: Click "Enter" on the keyboard
      DataExportViewAllLogs.selectUserByEnter();
      DataExportViewAllLogs.verifyUserDropdownExists();
    },
  );
});
