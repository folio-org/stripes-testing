import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Users from '../../../support/fragments/users/users';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    // checking of deleting window needs more time that import of 150 records
    const firstFilePathForUpload = 'oneThousandMarcBib.mrc';
    const firstMarcFileName = `C353638 autotestFileName_${getRandomPostfix()}`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    // use the file with 150 records for quick import
    const secondFilePathForUpload = 'marcBibFileForC353638.mrc';
    const secondMarcFileName = `C353638 autotestFileName_${getRandomPostfix()}`;

    before('login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
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
      'C353638 Verify proper system behavior for canceled import (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(firstFilePathForUpload, firstMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(firstMarcFileName);
        DataImport.deleteImportJob(firstMarcFileName);
        DataImport.verifyCancelImportJobModal();
        DataImport.cancelDeleteImportJob();
        DataImport.deleteImportJob(firstMarcFileName);
        DataImport.confirmDeleteImportJob();
        Logs.checkStatusOfJobProfile('Stopped by user');
        Logs.openFileDetails(firstMarcFileName);
        FileDetails.verifyLogDetailsPageIsOpened(firstMarcFileName);
        FileDetails.filterRecordsWithError(FileDetails.visibleColumnsInSummaryTable.ERROR);
        FileDetails.verifyLogSummaryTableIsHidden();

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(secondFilePathForUpload, secondMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(secondMarcFileName);
        DataImport.deleteImportJob(secondMarcFileName);
        JobProfiles.waitFileIsImported(secondMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      },
    );
  });
});
