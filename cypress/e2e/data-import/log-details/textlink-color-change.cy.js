import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353974 Check: Change Import log hotlinks to textLink: Landing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C353974'] },
      () => {
        // #1 Go to the "Data Import" app
        // User is on the Data Import landing page

        // #2 In the log, check that the style of the file names has changed
        // Instead of bold, the file name is lightly underlined.
        cy.wait(2000);
        Logs.verifyFirstFileNameStyle();

        // #3 Click any file name
        // Log details page opens
        Logs.clickFirstFileNameCell();
        FileDetails.verifyLogSummaryTableIsDisplayed();

        // #4 Go back to "Data import" landing page
        // * User is on Data import landing page
        // * The file name from step 3 has changed color. This means that we have already viewed this log
        FileDetails.close();
        DataImport.waitLoading();
        Logs.verifyVisitedLinkColor();
      },
    );
  });
});
