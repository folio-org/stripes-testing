import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditUpdateRecords.gui,
        Permissions.uiUsersView.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
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
    });

    it(
      'C374150 Verify Bulk edit state when navigating to another app and back-- In app + Local (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C374150'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);

        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.checkForUploading(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);

        TopMenuNavigation.navigateToApp('Users');
        UsersSearchPane.waitLoading();
        UsersSearchPane.searchByUsername(user.username);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
        cy.reload();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
      },
    );
  });
});
