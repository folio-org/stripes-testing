/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import DateTools from '../../../support/utils/dateTools';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    const startedDate = new Date();
    const completedDate = startedDate;
    // format date as YYYY-MM-DD
    const formattedStart = DateTools.getFormattedDate({ date: startedDate });
    // api endpoint expects completedDate increased by 1 day
    completedDate.setDate(completedDate.getDate() + 1);
    let firstUser;
    let secondUser;
    const jobProfileId = '6eefa4c6-bbf7-4845-ad82-de7fc5abd0e3';

    before(() => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        firstUser = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        // Log list should contain at least 30-35 import jobs, run by different users, and using different import profiles
        for (let i = 0; i < 25; i++) {
          const fileName = `oneMarcBib.mrc${getRandomPostfix()}`;

          DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName);
        }

        cy.logout();
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        secondUser = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        // Log list should contain at least 30-35 import jobs
        for (let i = 0; i < 8; i++) {
          const nameMarcFileForCreate = `C358136autotestFile.${getRandomPostfix()}.mrc`;

          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile('oneMarcAuthority.mrc', nameMarcFileForCreate);
          JobProfiles.waitFileIsUploaded();
          // need to wait until file will be uploaded in loop
          cy.wait(8000);
          JobProfiles.search('Default - Create SRS MARC Authority');
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameMarcFileForCreate);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        }
      });
    });

    after(() => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(firstUser.userId);
        Users.deleteViaApi(secondUser.userId);
        // TODO delete all created instances
      });
    });

    it(
      'C358136 A user can filter and delete import logs from the "View all" page (folijet)',
      { tags: [TestTypes.smoke, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.filterJobsByJobProfile('Default - Create SRS MARC Authority');
        LogsViewAll.filterJobsByDate({ from: formattedStart, end: formattedStart });

        const formattedEnd = DateTools.getFormattedDate({ date: completedDate });

        LogsViewAll.checkByDateAndJobProfile(
          { from: formattedStart, end: formattedEnd },
          jobProfileId,
        ).then((count) => {
          LogsViewAll.selectAllLogs();
          LogsViewAll.checkIsLogsSelected(count);
          LogsViewAll.unmarcCheckbox(0);
          LogsViewAll.checkmarkAllLogsIsRemoved();
          LogsViewAll.deleteLog();

          const countOfLogsForDelete = count - 1;
          DeleteDataImportLogsModal.confirmDelete(countOfLogsForDelete);
          LogsViewAll.verifyMessageOfDeleted(countOfLogsForDelete);
          LogsViewAll.modalIsAbsent();
        });
      },
    );
  });
});
