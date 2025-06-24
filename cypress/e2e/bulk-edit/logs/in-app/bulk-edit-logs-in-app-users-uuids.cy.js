import permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;
let userWithoutPermissions;
const invalidUserUUID = `invalidUserUUID_${getRandomPostfix()}`;
const invalidAndValidUserUUIDsFileName = `invalidAndValidUserUUIDS_${getRandomPostfix()}.csv`;
const matchedRecordsFileNameInvalidAndValid = BulkEditFiles.getMatchedRecordsFileName(
  invalidAndValidUserUUIDsFileName,
);
const errorsFromMatchingFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  invalidAndValidUserUUIDsFileName,
);
const previewOfProposedChangesFileName = BulkEditFiles.getPreviewFileName(
  invalidAndValidUserUUIDsFileName,
);
const updatedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(
  invalidAndValidUserUUIDsFileName,
);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  invalidAndValidUserUUIDsFileName,
);

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([], 'faculty').then((userProperties) => {
          userWithoutPermissions = userProperties;
        });
        cy.wait(3000);
        cy.createTempUser(
          [
            permissions.bulkEditLogsView.gui,
            permissions.bulkEditUpdateRecords.gui,
            permissions.uiUserEdit.gui,
          ],
          'staff',
        )
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            cy.wait(5000);
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            FileManager.createFile(
              `cypress/fixtures/${invalidAndValidUserUUIDsFileName}`,
              `${user.userId}\n${userWithoutPermissions.userId}\n${invalidUserUUID}`,
            );
          });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${invalidAndValidUserUUIDsFileName}`);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          invalidAndValidUserUUIDsFileName,
          `*${matchedRecordsFileNameInvalidAndValid}`,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
          errorsFromCommittingFileName,
          errorsFromMatchingFileName,
        );
      });

      it(
        'C375245 Verify genetated Logs files for Users In app -- valid and invalid records (firebird)',
        { tags: ['smoke', 'firebird', 'C375245', 'shiftLeft'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
          BulkEditSearchPane.uploadFile(invalidAndValidUserUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditActions.downloadMatchedResults();
          BulkEditActions.downloadErrors();

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditForm();
          BulkEditActions.fillPatronGroup('staff (Staff Member)');

          BulkEditActions.confirmChanges();
          BulkEditActions.downloadPreview();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditActions.downloadErrors();

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompletedWithErrors();

          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(invalidAndValidUserUUIDsFileName, [
            user.userId,
            userWithoutPermissions.userId,
            invalidUserUUID,
          ]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            `*${matchedRecordsFileNameInvalidAndValid}`,
            'User id',
            user.userId,
            'User name',
            user.username,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            `*${matchedRecordsFileNameInvalidAndValid}`,
            'User id',
            userWithoutPermissions.userId,
            'User name',
            userWithoutPermissions.username,
          );

          BulkEditLogs.downloadFileWithErrorsEncountered();
          BulkEditFiles.verifyMatchedResultFileContent(
            errorsFromMatchingFileName,
            // added '\uFEFF' to the expected result because in the story MODBULKOPS-412 byte sequence EF BB BF (hexadecimal) was added at the start of the file
            ['\uFEFFERROR', invalidUserUUID],
            'firstElement',
            false,
          );

          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyMatchedResultFileContent(
            previewOfProposedChangesFileName,
            ['staff', 'staff'],
            'patronGroup',
            true,
          );

          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            updatedRecordsFileName,
            ['staff'],
            'patronGroup',
            true,
          );

          BulkEditLogs.downloadFileWithCommitErrors();
          BulkEditFiles.verifyMatchedResultFileContent(
            errorsFromCommittingFileName,
            // added '\uFEFF' to the expected result because in the story MODBULKOPS-412 byte sequence EF BB BF (hexadecimal) was added at the start of the file
            ['\uFEFFWARNING', user.userId],
            'firstElement',
            false,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.searchByUsername(user.username);
          Users.verifyPatronGroupOnUserDetailsPane('staff');
          UsersSearchPane.searchByUsername(userWithoutPermissions.username);
          Users.verifyPatronGroupOnUserDetailsPane('staff');
        },
      );
    });
  });
});
