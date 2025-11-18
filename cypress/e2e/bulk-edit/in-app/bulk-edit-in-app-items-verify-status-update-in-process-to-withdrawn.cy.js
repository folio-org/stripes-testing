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
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';

let user;
const items = {
  available: {
    instanceName: `AT_C594355_FolioInstance_${getRandomPostfix()}`,
    barcode: `available${randomFourDigitNumber()}`,
    fileName: `availableItemBarcodes_${getRandomPostfix()}.csv`,
  },
  checkedOut: {
    instanceName: `AT_C594355_FolioInstance_${getRandomPostfix()}`,
    barcode: `checkedOut${randomFourDigitNumber()}`,
    fileName: `checkedOutItemBarcodes_${getRandomPostfix()}.csv`,
  },
  inProcess: {
    instanceName: `AT_C594355_FolioInstance_${getRandomPostfix()}`,
    barcode: `inProcess${randomFourDigitNumber()}`,
    fileName: `inProcessItemBarcodes_${getRandomPostfix()}.csv`,
  },
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

        // Create item with Available status
        InventoryInstances.createInstanceViaApi(
          items.available.instanceName,
          items.available.barcode,
        );
        FileManager.createFile(
          `cypress/fixtures/${items.available.fileName}`,
          items.available.barcode,
        );

        // Create item with Checked out status
        InventoryInstances.createInstanceViaApi(
          items.checkedOut.instanceName,
          items.checkedOut.barcode,
        );
        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${items.checkedOut.barcode}"`,
        }).then((res) => {
          const itemData = res;
          itemData.status = { name: ITEM_STATUS_NAMES.CHECKED_OUT };
          cy.updateItemViaApi(itemData);
        });
        FileManager.createFile(
          `cypress/fixtures/${items.checkedOut.fileName}`,
          items.checkedOut.barcode,
        );

        // Create item with In Process status
        InventoryInstances.createInstanceViaApi(
          items.inProcess.instanceName,
          items.inProcess.barcode,
        );
        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${items.inProcess.barcode}"`,
        }).then((res) => {
          const itemData = res;
          itemData.status = { name: ITEM_STATUS_NAMES.IN_PROCESS };
          cy.updateItemViaApi(itemData);
        });
        FileManager.createFile(
          `cypress/fixtures/${items.inProcess.fileName}`,
          items.inProcess.barcode,
        );

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(items.available.barcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(items.checkedOut.barcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(items.inProcess.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${items.available.fileName}`);
      FileManager.deleteFile(`cypress/fixtures/${items.checkedOut.fileName}`);
      FileManager.deleteFile(`cypress/fixtures/${items.inProcess.fileName}`);
    });

    it(
      'C594355 Verify update of Item records from "In Process" status to "Withdrawn" status (firebird)',
      { tags: ['criticalPath', 'firebird', 'C594355'] },
      () => {
        const availableFileNames = BulkEditFiles.getAllDownloadedFileNames(
          items.available.fileName,
          true,
        );

        // ========== SCENARIO 1: Available → In Process (Success) ==========
        // Steps 1-3: Select "Inventory - items" and upload CSV file with Available item
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Items');
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(items.available.fileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(items.available.barcode);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');

        // Step 4: Download matched records (CSV)
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          availableFileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          items.available.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.AVAILABLE,
        );

        // Step 5: Click "Actions" menu => Select "Start bulk edit"
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyCancelButtonDisabled(false);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 6-7: Select "Item status" and "In Process" status
        BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          items.available.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 9: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          availableFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          items.available.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 10: Commit changes - successful update
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          items.available.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 11: Download changed records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          availableFileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          items.available.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 12: Verify changes applied in Inventory
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', items.available.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);

        // Clean up downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(availableFileNames);

        // ========== SCENARIO 2: Checked out → In Process (Error) ==========
        const checkedOutFileNames = BulkEditFiles.getAllDownloadedFileNames(
          items.checkedOut.fileName,
          true,
        );

        // Steps 13-15: Navigate to Bulk edit and upload CSV file with Checked out item
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
          'Items',
          ITEM_IDENTIFIERS.ITEM_BARCODES,
        );
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(items.checkedOut.fileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(items.checkedOut.barcode);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');

        // Step 16: Download matched records (CSV)
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          checkedOutFileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          items.checkedOut.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.CHECKED_OUT,
        );

        // Step 17: Click "Actions" menu => Select "Start bulk edit"
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyRowIcons();

        // Step 18-19: Select "Item status" and "In Process" status
        BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 20: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          items.checkedOut.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 21: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          checkedOutFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          items.checkedOut.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 22: Commit changes - should get error
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyPaneRecordsChangedCount('0 item');
        BulkEditActions.verifySuccessBanner(0);
        BulkEditSearchPane.verifyErrorLabel(1);

        // Step 23: Check error table - status transition not allowed
        BulkEditSearchPane.verifyErrorByIdentifier(
          items.checkedOut.barcode,
          ERROR_MESSAGES.getInvalidStatusValueMessage(ITEM_STATUS_NAMES.IN_PROCESS),
        );

        // Step 24: Download errors CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(checkedOutFileNames.errorsFromCommitting, [
          `ERROR,${items.checkedOut.barcode},${ERROR_MESSAGES.getInvalidStatusValueMessage(ITEM_STATUS_NAMES.IN_PROCESS)}`,
        ]);

        // Step 25: Verify changes have NOT been applied in Inventory
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchByParameter('Barcode', items.checkedOut.barcode);
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.CHECKED_OUT);

        // Clean up downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(checkedOutFileNames);

        // ========== SCENARIO 3: In Process → Withdrawn (Success) ==========
        const inProcessFileNames = BulkEditFiles.getAllDownloadedFileNames(
          items.inProcess.fileName,
          true,
        );

        // Steps 26-28: Navigate to Bulk edit and upload CSV file with In Process item
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
          'Items',
          ITEM_IDENTIFIERS.ITEM_BARCODES,
        );
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(items.inProcess.fileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(items.inProcess.barcode);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');

        // Step 29: Download matched records (CSV)
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          inProcessFileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          items.inProcess.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );

        // Step 30: Click "Actions" menu => Select "Start bulk edit"
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyRowIcons();

        // Step 31-32: Select "Item status" and "Withdrawn" status
        BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.WITHDRAWN);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 33: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          items.inProcess.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.WITHDRAWN,
        );

        // Step 34: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          inProcessFileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          items.inProcess.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.WITHDRAWN,
        );

        // Step 35: Commit changes - successful update
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          items.inProcess.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.WITHDRAWN,
        );

        // Step 36: Download changed records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          inProcessFileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          items.inProcess.barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.WITHDRAWN,
        );

        // Step 37: Verify changes applied in Inventory
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchByParameter('Barcode', items.inProcess.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.WITHDRAWN);

        // Clean up downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(inProcessFileNames);
      },
    );
  });
});
