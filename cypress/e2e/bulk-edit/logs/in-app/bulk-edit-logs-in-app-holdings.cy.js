import getRandomPostfix from '../../../../support/utils/stringTools';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const invalidHoldingHRID = getRandomPostfix();
const invalidHoldingHRIDsFileName = `invalidHoldingHRIDs_${getRandomPostfix()}.csv`;
const errorsFromMatchingFileName = `*-Matching-Records-Errors-${invalidHoldingHRIDsFileName}*`;

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('in-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(
            `cypress/fixtures/${invalidHoldingHRIDsFileName}`,
            invalidHoldingHRID,
          );
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${invalidHoldingHRIDsFileName}`);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          invalidHoldingHRIDsFileName,
          errorsFromMatchingFileName,
        );
      });

      it(
        'C375299 Verify generated Logs files for Holdings In app -- only invalid records (firebird)',
        { tags: ['smoke', 'firebird', 'shiftLeft'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
          BulkEditSearchPane.uploadFile(invalidHoldingHRIDsFileName);
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowAction();

          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(invalidHoldingHRIDsFileName, [invalidHoldingHRID]);

          BulkEditLogs.downloadFileWithErrorsEncountered();
          BulkEditFiles.verifyMatchedResultFileContent(
            errorsFromMatchingFileName,
            [invalidHoldingHRID],
            'firstElement',
            false,
          );
        },
      );
    });
  });
});
