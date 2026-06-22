import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import MaterialTypes from '../../../support/fragments/settings/inventory/items/materialTypes';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let sourceId;
const postfix = getRandomPostfix();
const materialType1 = {
  name: `AT_C1348671 material type 1 ${postfix}`,
};
const materialType2 = {
  name: `AT_C1348671 material type 2 ${postfix}`,
};
const folioInstance = {
  title: `AT_C1348671 folio instance ${postfix}`,
  firstItemBarcode: `Item_first_${getRandomPostfix()}`,
  secondItemBarcode: `Item_second_${getRandomPostfix()}`,
  itemIds: [],
};
const itemBarcodes = [folioInstance.firstItemBarcode, folioInstance.secondItemBarcode];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Items', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          MaterialTypes.createMaterialTypesViaApi({
            name: materialType1.name,
            source: 'local',
          }).then((id) => {
            materialType1.id = id;
          });
          MaterialTypes.createMaterialTypesViaApi({
            name: materialType2.name,
            source: 'local',
          }).then((id) => {
            materialType2.id = id;
          });
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
            loanTypeId = res[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: folioInstance.uuid,
                permanentLocationId: locationId,
                sourceId,
              }).then((holding) => {
                folioInstance.holdingId = holding.id;
              });
              cy.wait(1000);
            })
            .then(() => {
              itemBarcodes.forEach((barcode) => {
                InventoryItems.createItemViaApi({
                  barcode,
                  holdingsRecordId: folioInstance.holdingId,
                  materialType: { id: materialType1.id },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  folioInstance.itemIds.push(item.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${itemBarcodesFileName}`,
                itemBarcodes.join('\n'),
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
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.uuid);
        MaterialTypes.deleteMaterialTypesViaApi(materialType1.id);
        MaterialTypes.deleteMaterialTypesViaApi(materialType2.id);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C1348671 Verify "Replace with" action for Items material type (firebird)',
        { tags: ['smoke', 'firebird', 'C1348671'] },
        () => {
          // Precondition: upload .csv file with valid Item barcodes
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
            'Items',
            ITEM_IDENTIFIERS.ITEM_BARCODES,
          );
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneRecordsCount('2 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemBarcodesFileName);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              materialType1.name,
            );
          });
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 1: Download matched records (CSV)
          BulkEditActions.downloadMatchedResults();
          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              materialType1.name,
            );
          });

          // Step 2: Uncheck "Material type" checkbox in the list of "Show columns"
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
          );
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            false,
          );
          // re-enable the column to verify the changes on the screen later
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
          );
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            true,
          );

          // Step 3: Start bulk edit
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 4: Verify "Material type" option is listed under "Item data" group
          BulkEditActions.verifyMaterialTypeOptionInItemDataGroup();

          // Step 5: Select "Material type" option
          BulkEditActions.selectItemMaterialType();
          BulkEditActions.replaceWithIsDisabled();
          BulkEditActions.verifyMaterialTypeSelectDropdownExists();

          // Step 6: The list is populated dynamically with material type names
          BulkEditActions.openSelectMaterialTypeDropdown();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(materialType1.name);
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(materialType2.name);

          // Step 7: Select material type that differs from current
          BulkEditActions.clickFilteredOption(materialType2.name);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              materialType2.name,
            );
          });
          BulkEditActions.verifyAreYouSureForm(2);

          // Step 9: Download preview in CSV format
          BulkEditActions.downloadPreview();
          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              materialType2.name,
            );
          });

          // Step 10: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);
          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              materialType2.name,
            );
          });

          // Step 11: Download changed records (CSV)
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              materialType2.name,
            );
          });

          // Step 12: Verify changes applied to Items in Inventory
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();
          itemBarcodes.forEach((barcode) => {
            InventorySearchAndFilter.searchByParameter('Barcode', barcode);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyMaterialType(materialType2.name);
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
