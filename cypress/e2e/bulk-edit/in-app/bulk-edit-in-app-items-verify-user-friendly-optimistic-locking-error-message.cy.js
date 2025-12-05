import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let sourceId;
let materialTypeId;
let fileNames;
const instance = {
  title: `AT_C468230_FolioInstance_${getRandomPostfix()}`,
  instanceId: null,
  holdingId: null,
  itemIds: [],
  itemBarcodes: [],
};
const bindingNote = 'binding note';
const administrativeNote = 'administrative note';
const errorMessage = ERROR_MESSAGES.OPTIMISTIC_LOCKING;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
        permissions.bulkEditQueryView.gui,
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
              title: instance.title,
            },
          }).then((createdInstanceData) => {
            instance.instanceId = createdInstanceData.instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: instance.instanceId,
              permanentLocationId: locationId,
              sourceId,
            }).then((holding) => {
              instance.holdingId = holding.id;

              for (let i = 0; i < 5; i++) {
                const barcode = `Item_${getRandomPostfix()}`;
                instance.itemBarcodes.push(barcode);

                InventoryItems.createItemViaApi({
                  barcode,
                  holdingsRecordId: instance.holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  instance.itemIds.push(item.id);
                });
              }
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
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C468230 Verify user-friendly error message for optimistic locking - items (firebird)',
      { tags: ['extendedPath', 'firebird', 'C468230'] },
      () => {
        // Step 1: Select "Inventory - items" radio button => Click "Build query" button
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();

        // Step 2-5: Build query to find items with specific status
        QueryModal.selectField(itemFieldValues.itemStatus);
        QueryModal.verifySelectedField(itemFieldValues.itemStatus);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect(ITEM_STATUS_NAMES.AVAILABLE);
        QueryModal.addNewRow();
        QueryModal.selectField(itemFieldValues.instanceId, 1);
        QueryModal.verifySelectedField(itemFieldValues.instanceId, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(instance.instanceId, 1);

        // Step 6: Click "Test query" button
        cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        QueryModal.clickTestQuery();

        // Step 7: Verify "Preview of the matched records" elements
        QueryModal.verifyPreviewOfRecordsMatched();

        // Step 8: Click "Run query" button
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();

        // Step 9-10: Check the result and show Item UUID and Barcode columns
        cy.wait('@getPreview', getLongDelay()).then((interception) => {
          const interceptedUuid = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/preview/,
          )[1];
          fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(interceptedUuid);

          BulkEditSearchPane.verifyBulkEditQueryPaneExists();
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          );

          instance.itemIds.forEach((itemId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              itemId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              itemId,
            );
          });

          // Step 11-13: Copy barcode, navigate to Inventory, and edit first item
          const itemToEditInInventoryId = instance.itemIds[0];
          const itemToEditBarcode = instance.itemBarcodes[0];

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', itemToEditBarcode);
          ItemRecordView.waitLoading();

          // Step 13: Add administrative note to item
          ItemRecordView.openItemEditForm('AT_C468230_FolioInstance');
          ItemRecordEdit.waitLoading('AT_C468230_FolioInstance');
          ItemRecordEdit.addAdministrativeNote(administrativeNote);
          ItemRecordEdit.saveAndClose();
          ItemRecordView.waitLoading();
          ItemRecordView.checkItemAdministrativeNote(administrativeNote);

          // Step 14: Click on "Bulk edit" app on the header
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);

          // Step 15: Download matched records (CSV)
          BulkEditActions.downloadMatchedResults();

          instance.itemIds.forEach((itemId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              itemId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              itemId,
            );
          });

          // Step 16: Click "Actions" menu => Select "Start bulk edit"
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 17-20: Select "Binding" option and "Add note" action
          BulkEditActions.addItemNote('Binding', bindingNote);
          BulkEditActions.verifyTheActionOptions([
            BULK_EDIT_ACTIONS.ADD_NOTE,
            BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
            BULK_EDIT_ACTIONS.FIND,
            BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
            BULK_EDIT_ACTIONS.REMOVE_ALL,
            BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
          ]);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 21: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(instance.itemIds.length);

          instance.itemBarcodes.forEach((itemBarcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              itemBarcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
              bindingNote,
            );
          });

          // Step 22: Click "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          instance.itemIds.forEach((itemId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              itemId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
              bindingNote,
            );
          });

          // Step 23: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          const successfullyEditedItemIds = instance.itemIds.slice(1);

          successfullyEditedItemIds.forEach((itemId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              itemId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
              bindingNote,
            );
          });

          // Step 24: Check the noted UUID of Item in table populated with Top 10 Errors
          cy.url().then((bulkEditUrl) => {
            BulkEditSearchPane.verifyNonMatchedResults(itemToEditInInventoryId, errorMessage);

            // Step 25: Click on "View latest version" active text
            BulkEditSearchPane.clickViewLatestVersionInErrorsAccordionByIdentifier(
              itemToEditInInventoryId,
            );
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemAdministrativeNote(administrativeNote);

            // Step 26: Download changed records (CSV)
            cy.visit(bulkEditUrl);
            BulkEditSearchPane.verifyErrorLabel(1);
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            successfullyEditedItemIds.forEach((itemId) => {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.changedRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                itemId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
                bindingNote,
              );
            });

            // Step 27: Download errors (CSV)
            BulkEditActions.downloadErrors();

            // Step 28: Check the noted UUIDs in .csv file with errors
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `ERROR,${itemToEditInInventoryId},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${instance.instanceId}/${instance.holdingId}/${itemToEditInInventoryId}`,
            ]);

            // Step 29: Navigate to Inventory and verify changes
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.waitLoading();
            InventorySearchAndFilter.switchToItem();

            const successfullyEditedBarcodes = instance.itemBarcodes.slice(1);

            successfullyEditedBarcodes.forEach((barcode) => {
              InventorySearchAndFilter.searchByParameter('Barcode', barcode);
              ItemRecordView.waitLoading();
              ItemRecordView.checkMultipleItemNotesWithStaffOnly(0, 'No', 'Binding', bindingNote);
              ItemRecordView.closeDetailView();
              InventorySearchAndFilter.resetAll();
            });
          });
        });
      },
    );
  });
});
