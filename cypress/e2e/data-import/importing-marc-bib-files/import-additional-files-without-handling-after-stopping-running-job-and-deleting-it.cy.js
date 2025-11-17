import { DEFAULT_JOB_PROFILE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const bigFileName = `C378883 autotestFile${getRandomPostfix()}.mrc`;
    const smallFileName = `C378883 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const numberOfLogsToDelete = '1';

    before('Login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
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
      'C378883 Verify the ability to import additional files without hanging after stopping a running job and deleting it (folijet)',
      { tags: ['criticalPathFlaky', 'folijet', 'C378883'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.waitLoading();
        DataImport.uploadFile('oneThousandMarcBib.mrc', bigFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(bigFileName);
        // TODO wait until at least 1% of the file will be processed
        cy.wait(5000);
        DataImport.deleteImportJob(bigFileName);
        DataImport.verifyCancelImportJobModal();
        DataImport.confirmDeleteImportJob();
        cy.wait(3000);
        Logs.checkJobStatus(bigFileName, JOB_STATUS_NAMES.STOPPED_BY_USER);
        DataImport.selectLog();
        DataImport.openDeleteImportLogsModal();
        DataImport.confirmDeleteImportLogs();
        InteractorsTools.checkCalloutMessage(
          `${numberOfLogsToDelete} data import logs have been successfully deleted.`,
        );
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', smallFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(smallFileName);
        Logs.checkJobStatus(smallFileName, JOB_STATUS_NAMES.COMPLETED);
      },
    );
  });
});
