import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const userBarcodesFileName = `userBarcodes-${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.uiUserEdit.gui,
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
      'C388492 Verify that User with "Bulk Edit: Local View" and "Bulk edit: In app - Edit user records" permissions can edit user records (in app) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C388492'] },
      () => {
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.verifyUsersUpdatePermission();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillPatronGroup('graduate (Graduate Student)');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.verifyUsersUpdatePermission();
      },
    );
  });
});
