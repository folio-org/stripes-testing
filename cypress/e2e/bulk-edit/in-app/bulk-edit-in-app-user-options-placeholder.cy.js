import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C365615 Verify that Options dropdown contains placeholder--Users in app (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C365615'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.isSelectActionAbsent();
        BulkEditActions.selectOption('Patron group');
        BulkEditActions.replaceWithIsDisabled();
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.selectOption('Expiration date', 1);
        BulkEditActions.replaceWithIsDisabled(1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.selectOption('Email', 2);
        BulkEditActions.replaceWithIsDisabled(2);
      },
    );
  });
});
