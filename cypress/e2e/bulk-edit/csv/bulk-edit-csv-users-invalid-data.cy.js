import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import FileManager from '../../../support/utils/fileManager';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFile = BulkEditFiles.getMatchedRecordsFileName(userUUIDsFileName);
const editedFileName = `edited-records-${getRandomPostfix()}.csv`;
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(userUUIDsFileName);
const patronGroup = {
  name: getTestEntityValue('staff'),
};
const invalidPatronGroup = `invalidPatronGroup${getRandomPostfix()}`;

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          errorsFromCommittingFileName,
          `*${matchedRecordsFile}`,
        );
      });
    });

    // TODO: implement the steps fully
    it(
      'C353943 Negative: Verify Local updating records with invalid data (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C353943'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.downloadMatchedResults();
        BulkEditActions.prepareValidBulkEditFile(
          matchedRecordsFile,
          editedFileName,
          patronGroup,
          invalidPatronGroup,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditSearchPane.uploadFile(editedFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.clickNext();
        BulkEditActions.commitChanges();

        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          user.userId,
          'No change in value required',
          'Warning',
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        BulkEditFiles.verifyCSVFileRowsValueIncludes(errorsFromCommittingFileName, [
          `WARNING,${user.userId},No change in value required`,
        ]);
        BulkEditFiles.verifyCSVFileRecordsNumber(errorsFromCommittingFileName, 1);
      },
    );
  });
});
