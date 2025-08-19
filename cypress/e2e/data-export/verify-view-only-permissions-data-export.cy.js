import permissions from '../../support/dictionary/permissions';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import Users from '../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../support/constants';
import DataExportViewAllLogs from '../../support/fragments/data-export/dataExportViewAllLogs';

let user;

describe('Data Export', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([permissions.dataExportViewOnly.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C523679 User with "data - UI-Data-Export - view" capability set is NOT able to trigger data export (firebird)',
    { tags: ['extendedPath', 'firebird', 'C523679'] },
    () => {
      // Step 1: Verify available applications on the landing page
      TopMenuNavigation.verifyNavigationItemAbsentOnTheBar(APPLICATION_NAMES.SETTINGS);
      TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.DATA_EXPORT);

      // Step 2: Go to the "Data export" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
      DataExportLogs.waitLoading();
      DataExportLogs.verifyUploadFileButtonDisabled();
      DataExportLogs.verifyViewAllLogsButtonEnabled();

      // Step 3: Click "View all" button in the "Logs" main pane
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
    },
  );
});
