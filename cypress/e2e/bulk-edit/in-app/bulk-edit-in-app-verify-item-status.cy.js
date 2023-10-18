import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    const testData = { csvFileName: 'cypress/fixtures/item_barcodes9.csv' };

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.bulkEditView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C353652 Verify item status to In-app bulk edit form (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        // #1 * Select the "Inventory - items", "Item barcode"
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        // #2 Upload a .csv file with valid Item barcodes
        BulkEditSearchPane.uploadFile('item_barcodes9.csv');
        BulkEditSearchPane.waitFileUploading();

        // #3 Click "Actions" menu => Select "Start bulk edit"
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();

        // #4 Select "Item status" option in the "Select option" dropdown
        BulkEditActions.selectOption('Item status');
        BulkEditActions.replaceWithIsDisabled();

        // #5 Verify available options
        BulkEditActions.verifyItemStatusOptions();
      },
    );
  });
});
