import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const status = 'Intellectual item';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
      });
    });

    after('Delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C356778 Verify narrow down options dropdown choices on Items in-app bulk edit form (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        // Select "Inventory-items" record type => Select "Items barcode" from "Record identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        // Upload a .csv file with items barcodes (see Preconditions) by dragging it on the file drag and drop area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        // Click "Actions" menu => Select "Start Bulk edit" option
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.isDisabledRowIcons(true);
        //  Click "Select option" dropdown in "Options" column under "Bulk edits" accordion
        BulkEditActions.verifyItemOptions();
        BulkEditActions.verifyItemAdminstrativeNoteActions(0);
        BulkEditActions.selectAction('Remove all', 0);
        BulkEditSearchPane.isConfirmButtonDisabled(false);

        function performBulkEditOptionActions(options) {
          for (let i = 1; i <= 9 && options.length > 0; i++) {
            // Click on the "Plus" icon
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.isDisabledRowIcons(false);

            // Click "Select option" dropdown on the added row
            BulkEditActions.verifyTheOptionsAfterSelectedOption(options[i], i);
            BulkEditActions.selectAction('Mark as staff only', i);
            BulkEditSearchPane.isConfirmButtonDisabled(false);
          }
        }

        const options = [
          'Administrative note',
          'Check in note',
          'Check out note',
          'Action note',
          'Binding',
          'Copy note',
          'Electronic bookplate',
          'Note',
          'Provenance',
          'Reproduction',
          'Item status',
          'Permanent loan type',
          'Temporary loan type',
          'Permanent item location',
          'Temporary item location',
          'Suppress from discovery',
        ];

        performBulkEditOptionActions(options);

        // Select "Item status" option => Select any option in "Select item status" dropdown => Click on the "Plus" icon => Click "Select option" dropdown on the added row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replaceItemStatus(status, 10);

        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillPermanentLoanType('Selected', 11);
        // Select "Temporary loan type" option => Select "Clear field" in "Select action" dropdown => Click on the "Plus" icon => Click "Select option" dropdown on the added row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearTemporaryLoanType(12);
        // Select "Permanent item location" option => Select "Clear field" in "Select action" dropdown => Click on the "Plus" icon => Click "Select option" dropdown on the added row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearPermanentLocation('item', 13);
        // Select "Temporary item location" option => Select "Clear field" in "Select action" dropdown => Click on the "Plus" icon
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearTemporaryLocation('item', 14);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.afterAllSelectedActions();
        BulkEditActions.verifyTheOptionsAfterSelectedAllOptions('Suppress from discovery', 15);
        // Click "Select option" dropdown on the added row
        BulkEditSearchPane.isConfirmButtonDisabled(true);
        BulkEditActions.editSuppressFromDiscovery(true, 15);
        BulkEditSearchPane.isConfirmButtonDisabled(false);
      },
    );
  });
});
