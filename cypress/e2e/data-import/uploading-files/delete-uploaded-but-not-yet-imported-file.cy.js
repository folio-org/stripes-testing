import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Uploading files', () => {
    let user;
    const quantityOfFiles = '2';
    const fileName = `C2377 autotestFile.${getRandomPostfix()}.mrc`;
    const filePathForUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

    before('create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        cy.wait(2000);
        DataImport.uploadBunchOfFiles(filePathForUpload, quantityOfFiles, fileName);
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2377 Delete an uploaded (but not yet imported) file (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'nonParallel'] },
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
