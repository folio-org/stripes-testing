import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
const invalidUsername = `username${getRandomPostfix()}`;
const invalidUsernamesFileName = `invalidUserUUIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidUsernamesFileName}*`;

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('csv approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditCsvEdit.gui,
          permissions.uiUsersView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          FileManager.createFile(`cypress/fixtures/${invalidUsernamesFileName}`, invalidUsername);

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${invalidUsernamesFileName}`);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          invalidUsernamesFileName,
          errorsFromMatchingFileName,
        );
      });

      it(
        'C375216 Verify generated Logs files for Users CSV -- only errors (firebird)',
        { tags: ['smoke', 'firebird', 'C375216'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'Usernames');
          cy.wait(2000);
          BulkEditSearchPane.uploadFile(invalidUsernamesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyNonMatchedResults(invalidUsername);
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
            `ERROR,${invalidUsername},No match found`,
          ]);
          FileManager.deleteFileFromDownloadsByMask(
            invalidUsernamesFileName,
            errorsFromMatchingFileName,
          );

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompletedWithErrorsWithoutModification();

          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(invalidUsernamesFileName, [invalidUsername]);

          BulkEditLogs.downloadFileWithErrorsEncountered();
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [
            `ERROR,${invalidUsername},No match found`,
          ]);
        },
      );
    });
  });
});
