import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const userBarcodesFileName = `AT_C347881_UserBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(userBarcodesFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditCsvView.gui, permissions.uiUsersView.gui]).then(
        (userProperties) => {
          user = userProperties;

          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
    });

    it(
      'C347881 Users | Downloading matching records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C347881'] },
      () => {
        // Step 1: Select "Users" radio button and "User Barcodes" identifier
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);

        // Step 2-3: Upload a .csv file with Users identifiers
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(userBarcodesFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('1 user');
        BulkEditSearchPane.verifyFileNameHeadLine(userBarcodesFileName);
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
        BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

        // Step 4: Click the Actions menu and select "Download matched records (CSV)" option
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        // Step 5: Verify the downloaded file contains information for all matched records
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.BARCODE,
          user.barcode,
          [
            { header: 'User name', value: user.username },
            { header: 'User id', value: user.userId },
          ],
        );
      },
    );
  });
});
