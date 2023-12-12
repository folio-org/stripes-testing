import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Users from '../../../support/fragments/users/users';

let user;
const maxLogsQuantityOnPage = 100;

describe('data-import', () => {
  describe('Log details', () => {
    before('create user and login', () => {
      cy.createTempUser([Permissions.dataImportDeleteLogs.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C367923 A user can delete logs from the Import app "View all" page (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.selectAllLogs();
        LogsViewAll.checkIsLogsSelected(maxLogsQuantityOnPage);
        LogsViewAll.deleteLog();
        DeleteDataImportLogsModal.cancelDelete(maxLogsQuantityOnPage);
        LogsViewAll.checkmarkAllLogsIsRemoved();

        LogsViewAll.selectAllLogs();
        LogsViewAll.checkIsLogsSelected(maxLogsQuantityOnPage);
        LogsViewAll.deleteLog();
        DeleteDataImportLogsModal.confirmDelete(maxLogsQuantityOnPage);
        LogsViewAll.verifyMessageOfDeleted(maxLogsQuantityOnPage);
        LogsViewAll.modalIsAbsent();
      },
    );
  });
});
