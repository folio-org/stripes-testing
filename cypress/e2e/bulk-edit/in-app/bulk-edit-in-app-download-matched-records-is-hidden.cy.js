import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();
const errorsFromMatchingFileName = BulkEditFiles.getErrorsFromMatchingFileName(userUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, invalidUserUUID);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(errorsFromMatchingFileName);
    });

    it(
      'C353545 Verify that Download matched records is hidden in case Errors only (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C353545'] },
      () => {
        // Navigate to the Bulk edit app => Select Inventory-Items
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.waitLoading();
        //  Select "Item UUIDs" from the "Select record-identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
        // Upload a .csv file with Items UUIDs (see Preconditions) by dragging it on the file drag and drop area
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        // Click the "Actions" menu
        BulkEditActions.openActions();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.downloadMatchedRecordsAbsent();
        // Click the "Download errors (CSV)" button
        BulkEditActions.downloadErrors();
      },
    );
  });
});
