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
const matchedRecordsFileNameInvalidAndValid = `Matched-Records-${invalidAndValidUserUUIDsFileName}`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidAndValidUserUUIDsFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${invalidAndValidUserUUIDsFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${invalidAndValidUserUUIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${invalidAndValidUserUUIDsFileName}`;

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('in-app approach', () => {
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
        { tags: ['smoke', 'firebird', 'shiftLeft'] },
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
          BulkEditFiles.verifyMatchedResultFileContent(
            `*${matchedRecordsFileNameInvalidAndValid}`,
            [user.userId, userWithoutPermissions.userId],
            'userId',
            true,
          );

          BulkEditLogs.downloadFileWithErrorsEncountered();
          BulkEditFiles.verifyMatchedResultFileContent(
            errorsFromMatchingFileName,
            [invalidUserUUID],
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
            [user.userId],
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
