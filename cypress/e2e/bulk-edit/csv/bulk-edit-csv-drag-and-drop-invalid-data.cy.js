import { Permissions, TestTypes, DevTeams } from '../../../support/dictionary';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const invalidIdentifiersFileName = 'ediFileForC353651.csv';
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
      });
    });
    after('delete test data', () => {
      cy.getAdminToken(() => {
        Users.deleteViaApi(user.userId);
      });
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
