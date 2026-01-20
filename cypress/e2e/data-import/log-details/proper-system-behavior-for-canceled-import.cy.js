import { DEFAULT_JOB_PROFILE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe(
    'Log details',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user;
      // checking of deleting window needs more time that import of 150 records
      const filePathForUpload = 'marcBibFileForC353638.mrc';
      const firstMarcFileName = `C353638 autotestFileName${getRandomPostfix()}.mrc`;
      const secondMarcFileName = `C353638 autotestFileName${getRandomPostfix()}.mrc`;
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

      before('Create test user and login', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
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
        'C353638 Verify proper system behavior for canceled import (folijet) (TaaS)',
        { tags: ['extendedPath', 'folijet', 'C353638'] },
        () => {
          DataImport.verifyUploadState();
          DataImport.uploadFile(filePathForUpload, firstMarcFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.checkFileIsRunning(firstMarcFileName);
          DataImport.deleteImportJob(firstMarcFileName);
          DataImport.verifyCancelImportJobModal();
          DataImport.cancelDeleteImportJob();
          DataImport.deleteImportJob(firstMarcFileName);
          DataImport.confirmDeleteImportJob();
          cy.wait(2000);
          Logs.checkJobStatus(firstMarcFileName, 'Stopped by user');
          Logs.openFileDetails(firstMarcFileName);
          FileDetails.verifyLogDetailsPageIsOpened(firstMarcFileName);
          FileDetails.close();
          DataImport.verifyUploadState();
          DataImport.uploadFile(filePathForUpload, secondMarcFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.checkFileIsRunning(secondMarcFileName);
          DataImport.deleteImportJob(secondMarcFileName);
          JobProfiles.waitFileIsImported(secondMarcFileName);
          Logs.checkJobStatus(secondMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        },
      );
    },
  );
});
