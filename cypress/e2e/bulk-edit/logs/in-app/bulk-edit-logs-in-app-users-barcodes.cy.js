import permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import DateTools from '../../../../support/utils/dateTools';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
const afterThreeMonthsDate = DateTools.getAfterThreeMonthsDateObj();
const validUserBarcodesFileName = `validUserBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${validUserBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${validUserBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${validUserBarcodesFileName}`;

const newExpirationDate = {
  date: afterThreeMonthsDate,
  dateWithSlashes: DateTools.getFormattedDateWithSlashes({ date: afterThreeMonthsDate }),
  dateWithDashes: DateTools.getFormattedDate({ date: afterThreeMonthsDate }),
};

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('in-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${validUserBarcodesFileName}`, user.barcode);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${validUserBarcodesFileName}`);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          validUserBarcodesFileName,
          `*${matchedRecordsFileName}`,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
        );
      });

      it(
        'C375244 Verify generated Logs files for Users In app -- only valid (firebird)',
        { tags: ['smoke', 'firebird'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
          BulkEditSearchPane.uploadFile(validUserBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.downloadMatchedResults();

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditForm();
          BulkEditActions.fillExpirationDate(newExpirationDate.date);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.fillPatronGroup('graduate (Graduate Student)', 1);
          BulkEditActions.confirmChanges();
          BulkEditActions.downloadPreview();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditSearchPane.openLogsSearch();
          BulkEditSearchPane.verifyLogsPane();
          BulkEditSearchPane.checkUsersCheckbox();
          BulkEditSearchPane.clickActionsRunBy(user.username);
          BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

          BulkEditSearchPane.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(validUserBarcodesFileName, [user.barcode]);

          BulkEditSearchPane.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            `*${matchedRecordsFileName}`,
            [user.barcode],
            'userBarcode',
            true,
          );

          BulkEditSearchPane.downloadFileWithProposedChanges();
          ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [
            'graduate',
            newExpirationDate.dateWithDashes,
          ]);

          BulkEditSearchPane.downloadFileWithUpdatedRecords();
          ExportFile.verifyFileIncludes(updatedRecordsFileName, [
            'graduate',
            newExpirationDate.dateWithDashes,
          ]);

          cy.visit(TopMenu.usersPath);
          UsersSearchPane.searchByUsername(user.username);
          Users.verifyPatronGroupOnUserDetailsPane('graduate');
          Users.verifyExpirationDateOnUserDetailsPane(newExpirationDate.dateWithSlashes);
        },
      );
    });
  });
});
