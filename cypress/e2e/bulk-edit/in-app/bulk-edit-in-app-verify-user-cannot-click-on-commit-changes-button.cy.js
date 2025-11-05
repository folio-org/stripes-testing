import { Permissions } from '../../../support/dictionary';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const editedFileName = `edited-records-${userBarcodesFileName}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser(
        [Permissions.bulkEditUpdateRecords.gui, Permissions.uiUserEdit.gui],
        'staff',
      ).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C360949 Verify that User cannot click on "Commit changes"  until preview is completed (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C360949'] },
      () => {
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();

        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, 'faculty');
        BulkEditActions.verifyAreYouSureForm(1, user.barcode);

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults('faculty');
      },
    );
  });
});
