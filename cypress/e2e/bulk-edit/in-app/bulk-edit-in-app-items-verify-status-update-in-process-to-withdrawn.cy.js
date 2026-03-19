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
  },
  lostAndPaid: {
    instanceName: `AT_C594355_FolioInstance_${getRandomPostfix()}`,
    barcode: `lostAndPaid${randomFourDigitNumber()}`,
  },
  withdrawnScenario: {
    fileName: `inProcessAndLostPaidItemBarcodes_${getRandomPostfix()}.csv`,
  },
};

const scenarios = [
  {
    itemKey: 'available',
    initialStatus: ITEM_STATUS_NAMES.AVAILABLE,
    targetStatus: ITEM_STATUS_NAMES.IN_PROCESS,
    shouldSucceed: true,
    recordCount: 1,
    barcodes: ['available'],
  },
  {
    itemKey: 'checkedOut',
    initialStatus: ITEM_STATUS_NAMES.CHECKED_OUT,
    targetStatus: ITEM_STATUS_NAMES.IN_PROCESS,
    shouldSucceed: false,
    recordCount: 1,
    barcodes: ['checkedOut'],
  },
  {
    itemKey: 'withdrawnScenario',
    initialStatuses: [ITEM_STATUS_NAMES.IN_PROCESS, ITEM_STATUS_NAMES.LOST_AND_PAID],
    targetStatus: ITEM_STATUS_NAMES.WITHDRAWN,
    shouldSucceed: true,
    recordCount: 2,
    barcodes: ['inProcess', 'lostAndPaid'],
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
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

        // Create item with Lost and paid status
        InventoryInstances.createInstanceViaApi(
          items.lostAndPaid.instanceName,
          items.lostAndPaid.barcode,
        );
        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${items.lostAndPaid.barcode}"`,
        }).then((res) => {
          const itemData = res;
          itemData.status = { name: ITEM_STATUS_NAMES.LOST_AND_PAID };
          cy.updateItemViaApi(itemData);
        });

        // Create CSV file with both In Process and Lost and paid barcodes
        FileManager.createFile(
          `cypress/fixtures/${items.withdrawnScenario.fileName}`,
          `${items.inProcess.barcode}\n${items.lostAndPaid.barcode}`,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(items.lostAndPaid.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${items.available.fileName}`);
      FileManager.deleteFile(`cypress/fixtures/${items.checkedOut.fileName}`);
      FileManager.deleteFile(`cypress/fixtures/${items.withdrawnScenario.fileName}`);
    });

    it(
      'C594355 Verify update of Item records from "In Process", "Lost and paid" statuses to "Withdrawn" status (firebird)',
      { tags: ['criticalPath', 'firebird', 'C594355'] },
      () => {
        scenarios.forEach((scenario) => {
          // Determine fileName based on scenario type
          let fileName;
          if (scenario.itemKey === 'withdrawnScenario') {
            fileName = items.withdrawnScenario.fileName;
          } else {
            fileName = items[scenario.itemKey].fileName;
          }

          const fileNames = BulkEditFiles.getAllDownloadedFileNames(fileName, true);

          // Select "Inventory - items" and upload CSV file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
            'Items',
            ITEM_IDENTIFIERS.ITEM_BARCODES,
          );
          BulkEditSearchPane.uploadFile(fileName);
          BulkEditSearchPane.waitFileUploading();

          // Verify matched results for all items in the scenario
          scenario.barcodes.forEach((barcodeKey) => {
            BulkEditSearchPane.verifySpecificItemsMatched(items[barcodeKey].barcode);
          });
          BulkEditSearchPane.verifyPaneRecordsCount(`${scenario.recordCount} item`);

          // Download matched records (CSV)
          BulkEditActions.downloadMatchedResults();

          // Verify matched records for all items
          scenario.barcodes.forEach((barcodeKey, index) => {
            const expectedStatus = scenario.initialStatuses
              ? scenario.initialStatuses[index]
              : scenario.initialStatus;
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              items[barcodeKey].barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
              expectedStatus,
            );
          });

          // Click "Actions" menu => Select "Start bulk edit"
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Select "Item status" and target status
          BulkEditActions.replaceItemStatus(scenario.targetStatus);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(scenario.recordCount);

          // Verify preview for all items
          scenario.barcodes.forEach((barcodeKey) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              items[barcodeKey].barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
              scenario.targetStatus,
            );
          });

          // Download preview in CSV format
          BulkEditActions.downloadPreview();

          // Verify preview CSV for all items
          scenario.barcodes.forEach((barcodeKey) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              items[barcodeKey].barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
              scenario.targetStatus,
            );
          });

          // Commit changes
          BulkEditActions.commitChanges();

          if (scenario.shouldSucceed) {
            // Verify successful update
            BulkEditActions.verifySuccessBanner(scenario.recordCount);

            // Verify changes for all items
            scenario.barcodes.forEach((barcodeKey) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                items[barcodeKey].barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                scenario.targetStatus,
              );
            });

            // Download changed records (CSV)
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            // Verify changed records CSV for all items
            scenario.barcodes.forEach((barcodeKey) => {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.changedRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                items[barcodeKey].barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                scenario.targetStatus,
              );
            });
          } else {
            // Verify error scenario
            BulkEditSearchPane.verifyPaneRecordsChangedCount('0 item');
            BulkEditActions.verifySuccessBanner(0);
            BulkEditSearchPane.verifyErrorLabel(scenario.recordCount);

            // Check error table - status transition not allowed
            scenario.barcodes.forEach((barcodeKey) => {
              BulkEditSearchPane.verifyErrorByIdentifier(
                items[barcodeKey].barcode,
                ERROR_MESSAGES.getInvalidStatusValueMessage(scenario.targetStatus),
              );
            });

            // Download errors CSV
            BulkEditActions.openActions();
            BulkEditActions.downloadErrors();
            scenario.barcodes.forEach((barcodeKey) => {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `ERROR,${items[barcodeKey].barcode},${ERROR_MESSAGES.getInvalidStatusValueMessage(scenario.targetStatus)}`,
              ]);
            });
          }

          // Navigate to Inventory and verify item status for all items
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();

          scenario.barcodes.forEach((barcodeKey, index) => {
            InventorySearchAndFilter.searchByParameter('Barcode', items[barcodeKey].barcode);
            ItemRecordView.waitLoading();
            const expectedStatus = scenario.shouldSucceed
              ? scenario.targetStatus
              : scenario.initialStatuses
                ? scenario.initialStatuses[index]
                : scenario.initialStatus;
            ItemRecordView.verifyItemStatus(expectedStatus);
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });

          // Clean up downloaded files
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);
        });
      },
    );
  });
});
