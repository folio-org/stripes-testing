import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const filePathForUpload = 'marcBibFileForC353638.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const marcFileName = `C353638 autotestFileName_${getRandomPostfix()}`;

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
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353638 Verify proper system behavior for canceled import (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(marcFileName);
        DataImport.deleteImportJob(marcFileName);
        DataImport.verifyCancelImportJobModal();
        DataImport.cancelDeleteImportJob();
        DataImport.deleteImportJob(marcFileName);
        DataImport.confirmDeleteImportJob();
        Logs.checkStatusOfJobProfile('Stopped by user');
        // Logs.openFileDetails(marcFileName);
      },
    );
  });
});
