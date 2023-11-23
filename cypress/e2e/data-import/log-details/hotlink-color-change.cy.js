import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('data-import', () => {
  describe('Log details', () => {
    let user;

    before('Create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C353986 Check the change Import log hotlinks to textLink: View all page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Click on the "Actions" -> select "View all"
        // User is on the View all Log page. At the top of the page, there should be an indication of how many import jobs there are.
        Logs.actionsButtonClick();
        Logs.viewAllLogsButtonClick();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.verifyQuantityOfLogs('');

        // #2 Checking style change for the "File name" column
        // The style of the buttons from the "File name" column has been changed from bold to normal text with a light underline below it, signifying it's a hotlink
        LogsViewAll.verifyFirstFileNameCellUnderlined();

        // #3 Click any file name
        // Log details page opened
        LogsViewAll.clickFirstFileNameCell();
        FileDetails.verifyLogSummaryTableIsDisplayed();

        // #4 Go back to  "View all"  page
        // * User is on Data import View all page
        // * The file name from step 3 has changed its color. This means that we have already viewed this log
        FileDetails.close();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.verifyVisitedLinkColor();
      },
    );
  });
});
