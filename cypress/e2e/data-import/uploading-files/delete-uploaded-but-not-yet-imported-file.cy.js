import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Uploading files', () => {
    let user;
    const quantityOfFiles = '2';
    const fileName = `C2377 autotestFile${getRandomPostfix()}.mrc`;
    const filePathForUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        DataImport.verifyUploadState();
        cy.wait(2000);
        DataImport.uploadBunchOfFiles(filePathForUpload, quantityOfFiles, fileName);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2377 Delete an uploaded (but not yet imported) file (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.clickResumeButton();
        JobProfiles.waitLoadingList();
        cy.visit(TopMenu.dataImportPath);
        DataImport.clickDeleteFilesButton();
        DataImport.verifyUploadSectionHasNoUplodedFiles();
        DataImport.uploadBunchOfFiles(filePathForUpload, quantityOfFiles, fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.deleteUploadedFile(fileName);
        JobProfiles.verifyDeleteUploadedFileModal();
        JobProfiles.cancelDeleteUploadedFile();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.deleteUploadedFile(fileName);
        JobProfiles.confirmDeleteUploadedFile();
        JobProfiles.verifyFileListArea(fileName);
        JobProfiles.waitLoadingList();
        cy.wait(1000);
        JobProfiles.deleteUploadedFile(fileName);
        JobProfiles.confirmDeleteUploadedFile();
        DataImport.checkIsLandingPageOpened();
      },
    );
  });
});
