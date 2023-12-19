import { Permissions } from '../../../support/dictionary';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Log details', () => {
    let user;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        LogsViewAll.expandButtonClick();
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C357057 Check that "Search/Filter" panel on the  "View all" page is saved collapsed state after returning from another application. (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to the "Data import" app
        // The "Data import" page is displayed

        // #2 Click on "Actions" button -> select "View all"
        // The user is redirected to the View all logs page
        Logs.actionsButtonClick();
        Logs.viewAllLogsButtonClick();
        LogsViewAll.viewAllIsOpened();

        // #3 In the 1st panel in the upper right corner, click the "Collapse Search & filter panel" button
        // The "Search & filter" panel has been collapsed
        LogsViewAll.collapseButtonClick();
        LogsViewAll.checkSearchPaneCollapsed();

        // #4 Go to the "Data export" app
        // The user is redirected to the "Data export" page
        TopMenuNavigation.navigateToApp('Data export');
        DataExportLogs.waitLoading();

        // #5 Go to the "Data import" app.
        // * The user is redirected to the View all logs page
        // * The "Search & filter" panel is saved in a collapsed state.
        TopMenuNavigation.navigateToApp('Data import');
        LogsViewAll.checkSearchPaneCollapsed();
      },
    );
  });
});
