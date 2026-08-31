import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Uploading files', () => {
    const filePathNoExtension = 'fileNoExtensionForC343279';
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
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
      'C343279 Disallow upload of a file without a file extension (promin)',
      { tags: ['extendedPath', 'promin', 'C343279'] },
      () => {
        const fileNameNoExtension = `${filePathNoExtension}${getRandomLetters(15)}`;

        // Step 1: Navigate to Data Import (done via login); verify landing page
        DataImport.verifyUploadState();

        // Step 2: Upload file without extension; verify Import blocked modal
        DataImport.uploadFile(filePathNoExtension, fileNameNoExtension, false);
        DataImport.verifyImportBlockedModal({ noExtension: true });

        // Step 3: Click Cancel; verify modal closes and landing page shown
        DataImport.cancelBlockedImportModal();
        DataImport.waitLoading();

        // Step 4: Upload same file without extension again; verify same modal appears
        DataImport.uploadFile(filePathNoExtension, fileNameNoExtension, false);
        DataImport.verifyImportBlockedModal({ noExtension: true });

        // Step 5: Click Choose other files to upload; verify modal closes
        DataImport.chooseOtherFilesBlockedImportModal();
      },
    );
  });
});
