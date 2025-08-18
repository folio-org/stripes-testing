import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
let userBarcodesFileName;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

      cy.createTempUser([
        permissions.uiUsersView.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C491300 Verify Users Patron group options ordered alphabetically (firebird)',
      { tags: ['extendedPath', 'firebird', 'C491300'] },
      () => {
        // Step 1-2: Select "Users" radio button on the "Record types" accordion =>
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');

        // Step 3: Upload a .csv file from Preconditions with large number of valid User Barcodes
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
        BulkEditSearchPane.verifyPaneRecordsCount('1 user');

        // Step 4: Click "Actions" menu once the file uploading completes => Select "Start bulk edit"
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyPaneRecordsCountInEditForm('1 user');
        BulkEditSearchPane.verifyPaneTitleFileName(userBarcodesFileName);

        // Step 5-6: Click "Select Option" dropdown
        BulkEditActions.selectOption('Patron group');
        BulkEditActions.replaceWithIsDisabled();

        // Step 7: Click on the dropdown with "Select patron group" placeholder
        BulkEditActions.verifyPatronGroupsAlphabeticalOrder();
      },
    );
  });
});
