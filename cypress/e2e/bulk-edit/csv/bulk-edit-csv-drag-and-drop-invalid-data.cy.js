import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const invalidIdentifiersFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
const csvContent = values.join('\n');

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${invalidIdentifiersFileName}`, csvContent);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken(() => {
        Users.deleteViaApi(user.userId);
      });
      FileManager.deleteFile(`cypress/fixtures/${invalidIdentifiersFileName}`);
    });

    it(
      'C692043 Verify "New bulk edit" button with invalid data (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C692043'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(invalidIdentifiersFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(invalidIdentifiersFileName, 0, 11);
        BulkEditSearchPane.actionsIsShown();
        BulkEditActions.verifyNoNewBulkEditButton();

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(invalidIdentifiersFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(invalidIdentifiersFileName, 0, 11);
        BulkEditSearchPane.actionsIsShown();
        BulkEditActions.verifyNoNewBulkEditButton();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.verifyBulkEditImage();
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();

        BulkEditSearchPane.verifySetCriteriaPaneElements();
      },
    );
  });
});
