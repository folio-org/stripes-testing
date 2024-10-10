import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Uploading files', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
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
      'C2356 Upload a file that does not have a file extension SETTING (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const filePathWithNotExistingFileExtension = 'file.txt';
        const fileNameWithNotExistingFileExtension = `C2356 autotestFile${getRandomPostfix()}.txt`;
        const filePathWithBlockedFileExtension = 'fileForC2356.mrk';
        const fileNameWithBlockedFileExtension = `C2356 autotestFile${getRandomPostfix()}.mrk`;

        DataImport.verifyUploadState();
        DataImport.uploadFile(
          filePathWithNotExistingFileExtension,
          fileNameWithNotExistingFileExtension,
        );
        JobProfiles.waitFileIsUploaded();
        DataImport.verifyFileIsImported(fileNameWithNotExistingFileExtension);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.clickDeleteFilesButton();
        DataImport.uploadFile(filePathWithBlockedFileExtension, fileNameWithBlockedFileExtension);
        DataImport.verifyImportBlockedModal();
      },
    );
  });
});
