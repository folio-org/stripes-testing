import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const instance = {
  title: `AT_C423560_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const validItemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const invalidItemBarcodesFileName = `invalidItemBarcodes_${getRandomPostfix()}.csv`;
const invalidBarcode = `invalidBarcode_${getRandomPostfix()}`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(instance.title, instance.itemBarcode);

        FileManager.createFile(
          `cypress/fixtures/${validItemBarcodesFileName}`,
          instance.itemBarcode,
        );
        FileManager.createFile(`cypress/fixtures/${invalidItemBarcodesFileName}`, invalidBarcode);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${validItemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
    });

    it(
      'C423560 Verify "Search column name" search box for Items records. (firebird)',
      { tags: ['extendedPath', 'firebird', 'C423560'] },
      () => {
        // Step 1: Select the "Inventory - Items" radio button => Select "Item barcode" option from the "Record identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

        // Step 2-3: Upload a .csv file with valid Item barcodes by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(validItemBarcodesFileName);
        BulkEditSearchPane.checkForUploading(validItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 4: Check the result as the upload is completed
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);

        // Step 5: Click "Actions" menu
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
        );

        // Step 6: Click on "Search column name" search box
        BulkEditSearchPane.verifySearchColumnNameTextFieldInFocus();

        // Step 7: Start typing any word from the list (e.g. "note")
        BulkEditSearchPane.searchColumnName('note');

        // Step 8: Check the checkbox near any column name from the result list (e.g. "Action note")
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
        );

        // Step 9: Click "Actions" menu => Start typing non-existing column name (e.g."non-existing")
        BulkEditSearchPane.clearSearchColumnNameTextfield();
        BulkEditSearchPane.searchColumnName('non-existing', false);

        // Step 10: Click "X" icon
        BulkEditSearchPane.clearSearchColumnNameTextfield();
        BulkEditSearchPane.verifySearchColumnNameTextFieldExists();

        // Step 11: Start typing again any word from the list (e.g. "ID") => Uncheck the checkbox near any column name from the result list (e.g. "Item ID")
        BulkEditSearchPane.searchColumnName('ID');
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
        );

        // Step 12: Click on "Bulk edit" app => Select "Inventory - Items" radio button => Select "Item barcode" option
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

        // Step 13: Upload a .csv file with invalid Item barcodes by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
        BulkEditSearchPane.checkForUploading(invalidItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);

        // Step 14: Click "Actions" menu
        BulkEditActions.openActions();
        BulkEditActions.downloadErrorsExists();
        BulkEditSearchPane.searchColumnNameTextfieldAbsent();
      },
    );
  });
});
