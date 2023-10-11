import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Users from '../../../support/fragments/users/users';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const bigFileName = `C378883autotestFile.${getRandomPostfix()}.mrc`;
    const smallFileName = `C378883autotestFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const numberOfLogsToDelete = '1';

    before('login', () => {
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

    after('delete user', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C378883 Verify the ability to import additional files without hanging after stopping a running job and deleting it (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneThousandMarcBib.mrc', bigFileName);
        // TODO wait until file will be uploaded
        cy.wait(5000);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(bigFileName);
        // TODO wait until at least 1% of the file will be processed
        cy.wait(5000);
        DataImport.deleteImportJob(bigFileName);
        DataImport.verifyCancelImportJobModal();
        DataImport.cancelImportJob();
        Logs.checkStatusOfJobProfile('Stopped by user');
        DataImport.selectLog();
        DataImport.openDeleteImportLogsModal();
        DataImport.confirmDeleteImportLogs();
        InteractorsTools.checkCalloutMessage(
          `${numberOfLogsToDelete} data import logs have been successfully deleted.`,
        );
        cy.reload();
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', smallFileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(smallFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      },
    );
  });
});
