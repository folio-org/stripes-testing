import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
let userToDelete;
const userUUIDsFileName = `userUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      // user without open transactions - the one that will be deleted
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        userToDelete = userProperties;
      });

      cy.createTempUser([
        permissions.bulkEditUsersDelete.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiUsersDelete.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `"${userToDelete.userId}"`);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
      // userToDelete is expected to be deleted by the test; ignore errors if already deleted
      Users.deleteViaApi(userToDelete.userId);
      FileManager.deleteFileFromDownloadsByMask(`*${matchedRecordsFileName}`, userUUIDsFileName);
    });

    it(
      'C1385648 Verify bulk delete Users (athena)',
      { tags: ['smoke', 'athena', 'C1385648'] },
      () => {
        // Preconditions (step 5): select Users, User UUIDs and upload file
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 1: Check the Preview of records matched
        BulkEditSearchPane.verifyPaneRecordsCount('1 user');
        BulkEditSearchPane.verifyMatchedResults(userToDelete.username);

        // Step 2: Open "Actions" menu and verify available options
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.startBulkEditButtonExists();
        BulkEditActions.verifySelectBulkEditProfileButtonExists('users');
        BulkEditActions.startBulkDeleteButtonExists();

        // Step 3: Download matched records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          `*${matchedRecordsFileName}`,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
          userToDelete.userId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
          userToDelete.userId,
        );

        // Step 4: Click "Start bulk delete" and verify the confirmation modal
        BulkEditActions.clickStartBulkDeleteButton();
        BulkEditActions.verifyDeleteUserRecordsModalContent(1, 30);
        BulkEditActions.verifyDeleteUserRecordsModalButtons();

        // Step 5: Click "Delete" and verify confirmation screen
        BulkEditActions.clickDeleteButtonInDeleteUserRecordsModal();
        BulkEditActions.verifyUsersDeletedSuccessfully(1, 1);
        BulkEditSearchPane.verifyPaneRecordsChangedCount(0);
        BulkEditSearchPane.verifyPaneTitleFileName(userUUIDsFileName);
        BulkEditSearchPane.verifyFileNameHeadLine(userUUIDsFileName);
        BulkEditActions.verifyActionsButtonAbsent();
        BulkEditSearchPane.verifyPaneRecordsChangedCount(0);
        BulkEditSearchPane.verifyPaneTitleFileName(userUUIDsFileName);
        BulkEditSearchPane.verifyFileNameHeadLine(userUUIDsFileName);

        // Step 6: Open "Logs" tab and filter to the latest Users delete job
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkUsersCheckbox();

        // Step 7: Click "..." action element in the row and verify available files
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionForBulkDelete();

        // Step 8: Download "File that was used to trigger the bulk edit"
        BulkEditLogs.downloadFileUsedToTrigger();
        BulkEditFiles.verifyCSVFileRows(userUUIDsFileName, [userToDelete.userId]);

        // Step 9: Download "File with the matching records"
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          `*${matchedRecordsFileName}`,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
          userToDelete.userId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.USER_ID,
          userToDelete.userId,
        );

        // Step 10: Verify the deleted User is not found anymore
        cy.getAdminToken();
        cy.getUsers({ limit: 1, query: `id==${userToDelete.userId}` }).then((users) => {
          expect(users).to.have.length(0);
        });

        cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        UsersSearchPane.searchByKeywords(userToDelete.username);
        UsersSearchPane.verifyUserIsAbsentInSearchResults(userToDelete.username);
      },
    );
  });
});
