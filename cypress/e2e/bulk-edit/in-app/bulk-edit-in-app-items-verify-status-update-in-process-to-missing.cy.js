import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';

let user;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemBarcodesFileName, true);
const item = {
  instanceName: `AT_C594356_FolioInstance_${getRandomPostfix()}`,
  barcode: `barcode${randomFourDigitNumber()}`,
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);

        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            const itemData = res;
            itemData.status = { name: ITEM_STATUS_NAMES.IN_PROCESS };
            cy.updateItemViaApi(itemData);
          },
        );

        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C594356 Verify update of Item records from "In Process" status to "Missing" status (firebird)',
      { tags: ['criticalPath', 'firebird', 'C594356'] },
      () => {
        // Steps 1-3: Select "Inventory - items" radio button and upload CSV file
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Items');
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');

        // Steps 4-6: First scenario - try to change "In Process" to "In Process"
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
        BulkEditActions.verifySecondActionSelected(BULK_EDIT_ACTIONS.REPLACE_WITH);
        BulkEditActions.verifyActionsSelectDropdownDisabled();

        // Step 7: Click "Confirm changes" button - "Are you sure?" form appears
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.barcode);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 8: Click "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 9: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyPaneRecordsChangedCount('0 item');
        BulkEditActions.verifySuccessBanner(0);
        BulkEditSearchPane.verifyErrorLabel(0, 1);

        // Step 10: Check the table populated with Top 10 Errors
        BulkEditSearchPane.verifyErrorByIdentifier(
          item.barcode,
          ERROR_MESSAGES.NO_CHANGE_REQUIRED,
          'Warning',
        );
        BulkEditSearchPane.verifySpinnerAbsent();

        // Step 11: Download errors CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `WARNING,${item.barcode},${ERROR_MESSAGES.NO_CHANGE_REQUIRED}`,
        ]);

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Steps 12-14: Second scenario - Navigate to bulk edit, select items, upload file
        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');

        // Step 15: Download matched records (CSV)
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 16: Click "Actions" menu => Select "Start bulk edit" element
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();

        // Step 17: Select "Item status" from the "Select option" dropdown
        BulkEditActions.selectOption('Item status');
        BulkEditActions.verifySecondActionSelected(BULK_EDIT_ACTIONS.REPLACE_WITH);
        BulkEditActions.verifyActionsSelectDropdownDisabled();

        // Step 18: Select "Long missing" status from "Select item status" dropdown
        BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.LONG_MISSING);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 19: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.LONG_MISSING,
        );

        // Step 20: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.LONG_MISSING,
        );

        // Step 21: Commit changes
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyPaneRecordsChangedCount('0 item');
        BulkEditActions.verifySuccessBanner(0);
        BulkEditSearchPane.verifyErrorLabel(1);

        // Step 22: Check error table - "Long missing" is not allowed
        BulkEditSearchPane.verifyErrorByIdentifier(
          item.barcode,
          ERROR_MESSAGES.getInvalidStatusValueMessage(ITEM_STATUS_NAMES.LONG_MISSING),
        );
        BulkEditSearchPane.verifySpinnerAbsent();

        // Step 23: Download errors CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${item.barcode},${ERROR_MESSAGES.getInvalidStatusValueMessage(ITEM_STATUS_NAMES.LONG_MISSING)}`,
        ]);

        // Step 24: Verify changes have NOT been applied in Inventory
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Steps 25-27: Third scenario - Navigate to bulk edit, select items, upload file, verify results
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');

        // Step 28: Download matched records (CSV)
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 29: Click "Actions" menu => Select "Start bulk edit" element
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();

        // Step 30: Select "Item status" from the "Select option" dropdown
        BulkEditActions.selectOption('Item status');

        // Step 31: Select "Missing" status from "Select item status" dropdown
        BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.MISSING);
        BulkEditActions.verifySecondActionSelected(BULK_EDIT_ACTIONS.REPLACE_WITH);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 32: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.MISSING,
        );

        // Step 33: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.MISSING,
        );

        // Step 34: Commit changes - successful update
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyPaneRecordsChangedCount('1 item');
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.MISSING,
        );

        // Step 35: Download changed records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          item.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.MISSING,
        );

        // Step 36: Verify changes have been applied in Inventory
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.MISSING);
      },
    );
  });
});
