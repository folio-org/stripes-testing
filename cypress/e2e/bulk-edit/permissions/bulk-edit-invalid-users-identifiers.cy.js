import TopMenu from '../../../support/fragments/topMenu';
import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();
const matchedRecordsFileName = BulkEditFiles.getErrorsFromMatchingFileName(userUUIDsFileName);

// Obsolete from Trillium (MODEXPW-598)
describe.skip('Bulk-edit', () => {
  describe('Permissions', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.exportManagerAll.gui,
        Permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, invalidUserUUID);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(`*${matchedRecordsFileName}`);
    });

    it(
      'C360963 Verify behavior when uploading only invalid Users identifiers  (firebird) (TaaS)',
      { tags: [] },
      () => {
        // Navigate to the "Bulk edit" app => Select "Users" App => Select "Users UUIDs" from "Records identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');

        // Upload .csv file  with **invalid** Users UUIDs by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyPaneRecordsCount('0 user');
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        // Navigate to the "Export manager" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
        ExportManagerSearchPane.waitLoading();
        ExportManagerSearchPane.searchByBulkEdit();
        ExportManagerSearchPane.getElementByTextAndVerify(user.username, 1, 0);

        ExportManagerSearchPane.clickJobIdInThirdPane();
        BulkEditFiles.verifyMatchedResultFileContent(
          matchedRecordsFileName,
          [user.userId],
          'userId',
          true,
        );
      },
    );
  });
});
