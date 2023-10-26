import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';

describe('data-import', () => {
  describe('Uploading files', () => {
    let user;

    before('create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2378 UIDATIMP-252: Uploading 2 files with the same extension, but different case, does not work (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const filesNames = ['C2378_File1.mrc', 'C2378_File2.MRC'];
        const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
        DataImport.verifyUploadState();
        DataImport.uploadBunchOfDifferentFiles(filesNames);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(filesNames[0]);
        JobProfileView.verifyInstanceImportStatus(0, 1, 'Completed');
        JobProfileView.verifyInstanceImportStatus(1, 1, 'Completed');
      },
    );
  });
});
