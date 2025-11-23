import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const itemUUIDsFileName = `itemUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);
const administrativeNote = `AT_C386512_AdminNote_${getRandomPostfix()}`.repeat(10);
const instance = {
  instanceTitle: `AT_C386512_FolioInstance_${getRandomPostfix()}`,
};
const testItems = [];
const numberOfItems = 10;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          materialTypeId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          sourceId = folioSource.id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instance.instanceTitle,
            },
          }).then((createdInstanceData) => {
            instance.instanceId = createdInstanceData.instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: instance.instanceId,
              permanentLocationId: locationId,
              sourceId,
            }).then((holding) => {
              instance.holdingId = holding.id;

              const itemsToCreate = Array.from({ length: numberOfItems }, (_, i) => ({
                barcode: `item_${i + 1}_${getRandomPostfix()}`,
                index: i,
              }));

              cy.wrap(itemsToCreate)
                .each((itemToCreate) => {
                  InventoryItems.createItemViaApi({
                    barcode: itemToCreate.barcode,
                    holdingsRecordId: instance.holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    const itemData = {
                      itemId: item.id,
                      itemHrid: item.hrid,
                      barcode: itemToCreate.barcode,
                    };

                    if (itemToCreate.index === 0) {
                      const updatedItem = item;
                      updatedItem.administrativeNotes = [administrativeNote];
                      cy.updateItemViaApi(updatedItem);
                    }

                    testItems.push(itemData);
                  });
                })
                .then(() => {
                  const itemUUIDs = testItems.map((item) => item.itemId).join('\n');

                  FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, itemUUIDs);
                });
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C386512 Verify that headers on the "Are you sure" are sticky (firebird)',
      { tags: ['extendedPath', 'firebird', 'C386512'] },
      () => {
        // Step 1: Select the "Inventory - items" radio button on the "Record types" accordion => Select "Item UUIDs" option from the "Record identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');

        // Step 2: Upload a .csv file with valid Items UUIDs by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.checkForUploading(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(...testItems.map((item) => item.barcode));

        // Step 3: Click "Actions" menu => Select checkboxes next to "Administrative Note" and "Suppress from discovery"
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          testItems[0].barcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          administrativeNote,
        );

        testItems.forEach((item) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            item.barcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            '',
          );
        });

        // Step 4: Click "Actions" menu => Select the "Start bulk edit" element
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();

        // Step 5: Click "Select Option" dropdown => Select "Suppress from discovery" option
        BulkEditActions.selectOption('Suppress from discovery');
        BulkEditActions.verifyOptionSelected('Suppress from discovery');

        // Step 6: Click "Select action" dropdown => Select "Set true" option
        BulkEditActions.selectSecondAction(BULK_EDIT_ACTIONS.SET_TRUE);
        BulkEditActions.verifySecondActionSelected(BULK_EDIT_ACTIONS.SET_TRUE);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(numberOfItems);
        BulkEditActions.verifyMessageBannerInAreYouSureForm(numberOfItems);

        testItems.forEach((item) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            item.barcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            'true',
          );
        });

        BulkEditSearchPane.verifyAreYouSureFormScrollableVertically();

        // Step 8: Scroll down to the bottom of the "Preview of records to be changed"
        BulkEditSearchPane.scrollInAreYouSureForm('bottom');
        BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
        );
        BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
        );

        // Step 9: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();

        // Verify CSV file contains all column headers
        BulkEditFiles.verifyColumnHeaderExistsInCsvFile(
          fileNames.previewRecordsCSV,
          Object.values(BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS).filter(
            (header) => header !== BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          ),
        );

        testItems.forEach((item) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            item.itemId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            true,
          );
        });

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          testItems[0].itemId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          administrativeNote,
        );

        // Step 10: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(numberOfItems);

        testItems.forEach((item) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            item.barcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            'true',
          );
        });

        // Step 11: Navigate to the "Inventory" app => Find and open updated Items records => Make sure that changes were applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.switchToItem();

        testItems.forEach((item) => {
          InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
          ItemRecordView.waitLoading();
          ItemRecordView.suppressedAsDiscoveryIsPresent();
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
