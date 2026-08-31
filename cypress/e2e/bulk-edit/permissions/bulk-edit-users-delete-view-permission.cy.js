import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

let user;
const invalidUserUUID = getRandomPostfix();
const userUUIDsFileName = `userUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName);
const errorsFromMatchingFileName = BulkEditFiles.getErrorsFromMatchingFileName(userUUIDsFileName);

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUsersDelete.gui, permissions.uiUsersView.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(
            `cypress/fixtures/${userUUIDsFileName}`,
            `"${user.userId}"\n"${invalidUserUUID}"`,
          );
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFileFromDownloadsByMask(
        `*${matchedRecordsFileName}`,
        errorsFromMatchingFileName,
      );
    });

    it(
      'C1385649 User with "data - UI-Bulk-Edit Users - delete" and "data - UI-Users - view" permissions is NOT able to start bulk edit and to start bulk delete of Users (athena)',
      { tags: ['smoke', 'athena', 'C1385649'] },
      () => {
        // Step 1-2: Upload a .csv file with User UUIDs
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Matched records accordion is populated with matched User records
        BulkEditSearchPane.verifyMatchedResults(user.username);
        // Errors & warnings accordion is populated with not matched User records
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        // Step 3: Open "Actions" menu and verify available options
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.startBulkEditAbsent();
        BulkEditActions.verifySelectBulkEditProfileButtonAbsent('users');
        BulkEditActions.startBulkDeleteAbsent();

        // Step 4: Download matched records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        // Step 5: Download errors (CSV)
        BulkEditActions.downloadErrors();
      },
    );
  });
});
