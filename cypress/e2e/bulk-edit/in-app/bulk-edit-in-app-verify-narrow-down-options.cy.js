import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const status = 'Intellectual item';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditView.gui,
        Permissions.inventoryAll.gui,
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

    it.skip(
      'C356778 Verify narrow down options dropdown choices on Items in-app bulk edit form (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C356778'] },
      () => {
        // TODO: improve how the options are checked
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

        function removeItem(option) {
          for (let j = 0; j <= option.length > 0; j++) {
            const selectedOption = option[j];
            const indexToRemove = options.indexOf(selectedOption);
            if (indexToRemove !== -1) {
              options.splice(indexToRemove, 1);
            }
          }
        }
        // Select "Inventory-items" record type => Select "Items barcode" from "Record identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
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
        BulkEditActions.selectSecondAction('Remove all', 0);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        cy.wait(1000);
        function performBulkEditOptionActions(option) {
          for (let i = 1; i <= 9 && option.length > 0; i++) {
            // Click on the "Plus" icon
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.isDisabledRowIcons(false);
            // Click "Select option" dropdown on the added row
            BulkEditActions.verifyTheOptionsAfterSelectedOption(option[i], i);
            BulkEditActions.selectSecondAction('Mark as staff only', i);
            BulkEditActions.verifyConfirmButtonDisabled(false);
          }
          removeItem(options);
        }
        performBulkEditOptionActions(options);

        // Select "Item status" option => Select any option in "Select item status" dropdown => Click on the "Plus" icon => Click "Select option" dropdown on the added row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replaceItemStatus(status, 10);
        removeItem(options);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillPermanentLoanType('Selected', 11);
        removeItem(options);
        // Select "Temporary loan type" option => Select "Clear field" in "Select action" dropdown => Click on the "Plus" icon => Click "Select option" dropdown on the added row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearTemporaryLoanType(12);
        removeItem(options);
        // // Select "Permanent item location" option => Select "Clear field" in "Select action" dropdown => Click on the "Plus" icon => Click "Select option" dropdown on the added row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearPermanentLocation('item', 13);
        removeItem(options);
        // Select "Temporary item location" option => Select "Clear field" in "Select action" dropdown => Click on the "Plus" icon
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearTemporaryLocation('item', 14);
        removeItem(options);
        BulkEditActions.addNewBulkEditFilterString();
        removeItem(options);
        BulkEditActions.verifyTheOptionsAfterSelectedAllOptions('Suppress from discovery', 15);
        // Click "Select option" dropdown on the added row
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.editSuppressFromDiscovery(true, 15);
        BulkEditActions.verifyConfirmButtonDisabled(false);
      },
    );
  });
});
