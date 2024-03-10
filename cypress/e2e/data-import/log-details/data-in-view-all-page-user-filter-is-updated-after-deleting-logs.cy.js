import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    let userFilterValue;

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        userFilterValue = `${user.firstName} ${user.lastName}`;

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
      'C358546 Data Import log: Check that data in the "View all" page User filter is updated after deleting the logs for particular users. (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const filesNames = ['marcBibFileForC358546_1.mrc', 'marcBibFileForC358546_2.MRC'];
        const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

        DataImport.verifyUploadState();
        DataImport.uploadBunchOfDifferentFiles(filesNames);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(filesNames[1]);
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(userFilterValue);
        cy.wait(2000); // need wait because will select all logs without waiting filtered logs
        LogsViewAll.selectAllLogs();
        LogsViewAll.deleteLog();
        DeleteDataImportLogsModal.confirmDelete(2);
        LogsViewAll.verifyMessageOfDeleted(2);
        LogsViewAll.verifyUserNameIsAbsntInFilter(userFilterValue);
      },
    );
  });
});
