import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const numberOfLogsToDelete = 5;
    const numberOfLogsPerPage = 25;
    const getCalloutSuccessMessage = (logsCount) => `${logsCount} data import logs have been successfully deleted.`;

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
      'C356825 The "select all" button does not select all logs after deleting multiple logs from the DI landing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        DataImport.checkMultiColumnListRowsCount(numberOfLogsPerPage);
        new Array(numberOfLogsToDelete).fill(null).forEach((_, index) => {
          cy.wait(1000);
          DataImport.selectLog(index);
        });
        DataImport.verifyLogsPaneSubtitleExist(numberOfLogsToDelete);
        DataImport.openDeleteImportLogsModal();
        DataImport.confirmDeleteImportLogs();
        InteractorsTools.checkCalloutMessage(getCalloutSuccessMessage(numberOfLogsToDelete));
        DataImport.checkMultiColumnListRowsCount(numberOfLogsPerPage);
        DataImport.selectAllLogs();
        DataImport.verifyLogsPaneSubtitleExist(numberOfLogsPerPage);
      },
    );
  });
});
