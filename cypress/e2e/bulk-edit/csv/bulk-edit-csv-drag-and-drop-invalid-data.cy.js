import { Permissions, TestTypes, DevTeams } from '../../../support/dictionary';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

let user;
const invalidIdentifiersFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
const csvContent = values.join('\n');

describe('bulk-edit', () => {
  describe('Identify user records for bulk edit', () => {
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
      'C353651 - "New bulk edit" button with invalid data (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
        BulkEditSearchPane.uploadFile(invalidIdentifiersFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(invalidIdentifiersFileName, 0, 11);
        BulkEditSearchPane.actionsIsShown();
        BulkEditActions.verifyNoNewBulkEditButton();

        BulkEditSearchPane.verifyDragNDropItemUUIDsArea();
        BulkEditSearchPane.uploadFile(invalidIdentifiersFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(invalidIdentifiersFileName, 0, 11);
        BulkEditSearchPane.actionsIsShown();
        BulkEditActions.verifyNoNewBulkEditButton();

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyBulkEditImage();
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();

        BulkEditSearchPane.verifySetCriteriaPaneElements();
      },
    );
  });
});
