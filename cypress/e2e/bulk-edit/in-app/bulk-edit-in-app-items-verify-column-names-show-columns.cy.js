import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';

let user;
const instance = {
  instanceName: `AT_C446038_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemBarcodesFileName, true);

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

        instance.instanceId = InventoryInstances.createInstanceViaApi(
          instance.instanceName,
          instance.itemBarcode,
        );

        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${instance.itemBarcode}"`,
        }).then((items) => {
          instance.itemHRID = items.hrid;
          instance.itemUUID = items.id;

          FileManager.createFile(
            `cypress/fixtures/${itemBarcodesFileName}`,
            `${instance.itemBarcode}`,
          );
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C446038 Verify column names under "Show columns" section - items (firebird)',
      { tags: ['extendedPath', 'firebird', 'C446038'] },
      () => {
        // Step 1: Select "Inventory-items" record type => Select "Item barcode" from "Record identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

        // Step 2: Upload a .csv file with item barcodes by dragging it on the Drag & drop area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: The .csv file with Items barcodes has being uploaded
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);

        // Step 4: Click "Actions" menu => Check column names under "Show columns" section
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditSearchPane.verifyItemActionShowColumns();

        // Step 5: Check the columns in table under "Preview of record matched" accordion
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();

        // Step 6: Check/uncheck some checkboxes
        const columnToCheck = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
        ];

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(...columnToCheck);

        columnToCheck.forEach((column) => {
          BulkEditSearchPane.verifyResultColumnTitles(column, true);
        });

        const columnsToUncheck = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
        ];

        BulkEditSearchPane.uncheckShowColumnCheckbox(...columnsToUncheck);

        // Step 7: Click "Actions" menu => Select "Download matched records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        const allItemColumns = Object.values(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS).filter(
          (column) => !column.includes(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER),
        );

        BulkEditFiles.verifyColumnHeaderExistsInCsvFile(
          fileNames.matchedRecordsCSV,
          allItemColumns,
        );

        // Step 8: Start bulk edit with any option and action => Click "Confirm changes" button
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.selectOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.SET_TRUE);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        const selectedColumns = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_EFFECTIVE_LOCATION,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.EFFECTIVE_CALL_NUMBER,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
          ...columnToCheck,
        ];

        selectedColumns.forEach((column, index) => {
          if (index < 4) {
            BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(column);
          } else {
            BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(column, true);
          }
        });
        columnsToUncheck.forEach((column) => {
          BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude(column);
        });

        // Step 9: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyColumnHeaderExistsInCsvFile(
          fileNames.previewRecordsCSV,
          allItemColumns,
        );

        // Step 10: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner();

        // Step 11: Check the columns in table under "Preview of record changed" accordion
        selectedColumns.forEach((column) => {
          BulkEditSearchPane.verifyChangedColumnTitlesInclude(column);
        });
        columnsToUncheck.forEach((column) => {
          BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(column);
        });

        // Step 12: Click "Actions" menu => Select "Download changed records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyColumnHeaderExistsInCsvFile(
          fileNames.changedRecordsCSV,
          allItemColumns,
        );

        // Step 13: Navigate to "Inventory" app => Search for recently edited Items => Verify changes applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();
      },
    );
  });
});
