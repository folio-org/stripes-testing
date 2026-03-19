import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import DateTools from '../../../support/utils/dateTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userBarcodesFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(userBarcodesFileName);
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const date = DateTools.getFormattedDate({ date: new Date() });

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getUsers({ limit: 1, query: `username=${user.username}` }).then((users) => {
          cy.updateUser({
            ...users[0],
            enrollmentDate: date,
          });
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
    });

    it(
      'C388498 Negative: Verify Local updating records with invalid date (firebird)',
      { tags: ['extendedPath', 'firebird', 'C388498'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');

        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();

        const invalidDate = 'June 19';
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFileName,
          editedFileName,
          date,
          invalidDate,
        );

        BulkEditActions.openStartBulkEditLocalForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();

        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [`ERROR,${user.barcode},`]);
      },
    );
  });
});
