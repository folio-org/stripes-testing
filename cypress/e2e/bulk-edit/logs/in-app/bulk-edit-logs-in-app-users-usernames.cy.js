import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
const invalidUsername = `invalidUsername_${getRandomPostfix()}`;
const invalidUsernamesFilename = `invalidUsername_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidUsernamesFilename}*`;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUsersView.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${invalidUsernamesFilename}`, invalidUsername);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${invalidUsernamesFilename}`);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          invalidUsernamesFilename,
          errorsFromMatchingFileName,
        );
      });

      it(
        'C375246 Verify generated Logs files for Users In app -- only invalid records (firebird)',
        { tags: ['smoke', 'firebird', 'C375246'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'Usernames');
          BulkEditSearchPane.uploadFile(invalidUsernamesFilename);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyNonMatchedResults(invalidUsername);
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
            `ERROR,${invalidUsername},No match found`,
          ]);
          FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingFileName);

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompletedWithErrorsWithoutModification();

          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(invalidUsernamesFilename, [invalidUsername]);

          BulkEditLogs.downloadFileWithErrorsEncountered();
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
            `ERROR,${invalidUsername},No match found`,
          ]);
        },
      );
    });
  });
});
