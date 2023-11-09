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
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C357009 Check the log sort on the Data Import View all page (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const descending = true;
        const columnHeaders = [
          'File name',
          'Status',
          'Records',
          'Job profile',
          'Started running',
          'Ended running',
          'Run by',
          'ID',
        ];
        Logs.openViewAllLogs();
        columnHeaders.forEach((columnName) => {
          LogsViewAll.verifyColumnIsSorted(columnName);
          LogsViewAll.verifyColumnIsSorted(columnName, descending);
        });
      },
    );
  });
});
