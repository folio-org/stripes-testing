import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';

describe('data-import', () => {
  describe('Log details', () => {
    let user;

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C357009 Check the log sort on the Data Import View all page (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const descending = true;
        Logs.openViewAllLogs();
        LogsViewAll.clickOnColumnName('File name');
        LogsViewAll.verifyColumnIsSorted('File name');
        LogsViewAll.clickOnColumnName('File name');
        LogsViewAll.verifyColumnIsSorted('File name', descending);
        LogsViewAll.clickOnColumnName('Status');
        LogsViewAll.verifyColumnIsSorted('Status');
        LogsViewAll.clickOnColumnName('Status');
        LogsViewAll.verifyColumnIsSorted('Status', descending);
        LogsViewAll.clickOnColumnName('Records');
        LogsViewAll.verifyColumnIsSorted('Records');
        LogsViewAll.clickOnColumnName('Records');
        LogsViewAll.verifyColumnIsSorted('Records', descending);
        LogsViewAll.clickOnColumnName('Job profile');
        LogsViewAll.verifyColumnIsSorted('Job profile');
        LogsViewAll.clickOnColumnName('Job profile');
        LogsViewAll.verifyColumnIsSorted('Job profile', descending);
        LogsViewAll.clickOnColumnName('Started running');
        LogsViewAll.verifyColumnIsSorted('Started running');
        LogsViewAll.clickOnColumnName('Started running');
        LogsViewAll.verifyColumnIsSorted('Started running', descending);
        LogsViewAll.clickOnColumnName('Ended running');
        LogsViewAll.verifyColumnIsSorted('Ended running');
        LogsViewAll.clickOnColumnName('Ended running');
        LogsViewAll.verifyColumnIsSorted('Ended running', descending);
        LogsViewAll.clickOnColumnName('Run by');
        LogsViewAll.verifyColumnIsSorted('Run by');
        LogsViewAll.clickOnColumnName('Run by');
        LogsViewAll.verifyColumnIsSorted('Run by', descending);
        LogsViewAll.clickOnColumnName('ID');
        LogsViewAll.verifyColumnIsSorted('ID');
        LogsViewAll.clickOnColumnName('ID');
        LogsViewAll.verifyColumnIsSorted('ID', descending);
      },
    );
  });
});
