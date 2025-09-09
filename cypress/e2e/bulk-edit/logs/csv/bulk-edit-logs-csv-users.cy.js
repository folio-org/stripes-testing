import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${userUUIDsFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const previewOfProposedChangesFileName = {
  first: `*-Updates-Preview-CSV-${userUUIDsFileName}`,
  second: `*-Updates-Preview-CSV-${editedFileName}`,
};
const updatedRecordsFileName = `*-Changed-Records*-${userUUIDsFileName}`;

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('csv approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;

          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `${user.userId}`);

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          userUUIDsFileName,
          `*${matchedRecordsFileName}`,
          previewOfProposedChangesFileName.first,
          updatedRecordsFileName,
        );
      });

      it(
        'C375217 Verify generated Logs files for Users Local (firebird)',
        { tags: ['smoke', 'firebird', 'C375217'] },
        () => {
          BulkEditSearchPane.checkUsersRadio();
          BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
          BulkEditSearchPane.uploadFile(userUUIDsFileName);
          BulkEditSearchPane.waitLoading();

          // Prepare file for bulk edit
          const nameToUpdate = `testNameToUpdate_${getRandomPostfix()}`;
          BulkEditActions.downloadMatchedResults();
          BulkEditActions.prepareValidBulkEditFile(
            matchedRecordsFileName,
            editedFileName,
            'testPermFirst',
            nameToUpdate,
          );

          // Upload bulk edit file
          BulkEditActions.openStartBulkEditForm();
          BulkEditSearchPane.uploadFile(editedFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.clickNext();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults(nameToUpdate);

          // Open logs by users
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();

          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted();
          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyMatchedResultFileContent(
            userUUIDsFileName,
            [user.userId],
            'userId',
            true,
          );

          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            `*${matchedRecordsFileName}`,
            [user.userId],
            'userId',
            true,
          );

          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyMatchedResultFileContent(
            previewOfProposedChangesFileName.first,
            [nameToUpdate],
            'firstName',
            true,
          );

          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            updatedRecordsFileName,
            [nameToUpdate],
            'firstName',
            true,
          );
        },
      );
    });
  });
});
