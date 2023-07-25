import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import DateTools from '../../../support/utils/dateTools';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;
let testUser;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userBarcodesFileName}`;
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const errorsInChangedRecordsFileName = `*-Errors-${editedFileName}`;
const changedRecordsFileName = `*-Changed-Records*-${editedFileName}`;

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([]).then(userProperties => { testUser = userProperties });
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });
          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, `${user.barcode}\r\n${testUser.barcode}`);
        });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, errorsInChangedRecordsFileName, changedRecordsFileName);
    });

    it('C388498 Negative: Verify CSV updating records with invalid date (firebird)', { tags: [testTypes.extendedPath, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

      BulkEditSearchPane.uploadFile(userBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.downloadMatchedResults();

      const date = DateTools.getFormattedDate({ date: new Date() });
      const invalidDate = 'June 19';
      BulkEditActions.prepareValidBulkEditFile(matchedRecordsFileName, editedFileName, date, invalidDate);

      BulkEditActions.openStartBulkEditForm();
      BulkEditSearchPane.uploadFile(editedFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.clickNext();
      BulkEditActions.commitChanges();

      BulkEditSearchPane.verifyErrorLabelAfterChanges(editedFileName, 1, 1);
      BulkEditSearchPane.verifyReasonForError('Field "createdDate"');
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();
      BulkEditActions.downloadErrors();
      BulkEditFiles.verifyMatchedResultFileContent(changedRecordsFileName, [testUser.barcode], 'userBarcode', true);
      BulkEditFiles.verifyMatchedResultFileContent(errorsInChangedRecordsFileName, [user.barcode], 'firstElement', false);
    });
  });
});
