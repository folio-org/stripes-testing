import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import MaterialTypes from '../../../../support/fragments/settings/inventory/items/materialTypes';
import MaterialTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/items/materialTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let sourceId;
const postfix = getRandomPostfix();
const sharedMaterialType1 = {
  payload: {
    name: `AT_C1348706 Shared material type 1 ${postfix}`,
  },
};
const sharedMaterialType2 = {
  payload: {
    name: `AT_C1348706 Shared material type 2 ${postfix}`,
  },
};
const localMaterialType = {
  id: uuid(),
  name: `AT_C1348706 Local material type ${postfix}`,
  source: 'local',
};
const folioInstance = {
  title: `AT_C1348706 folio instance ${postfix}`,
  itemWithSharedMaterialTypeBarcode: `Item_shared_${getRandomPostfix()}`,
  itemWithLocalMaterialTypeBarcode: `Item_local_${getRandomPostfix()}`,
  itemIds: [],
};
const itemBarcodes = [
  folioInstance.itemWithSharedMaterialTypeBarcode,
  folioInstance.itemWithLocalMaterialTypeBarcode,
];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName, true);

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        // create shared material types in central
        MaterialTypesConsortiumManager.createViaApi(sharedMaterialType1).then((materialType) => {
          sharedMaterialType1.id = materialType.settingId;
        });
        MaterialTypesConsortiumManager.createViaApi(sharedMaterialType2).then((materialType) => {
          sharedMaterialType2.id = materialType.settingId;
        });

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // affiliate the user to the member tenant and grant permissions there
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ]);

          // create local material type in member tenant
          MaterialTypes.createMaterialTypesViaApi(localMaterialType);

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
              // create folio instance in member tenant
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
              // create holdings in member tenant
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
              // item with shared material type
              InventoryItems.createItemViaApi({
                barcode: folioInstance.itemWithSharedMaterialTypeBarcode,
                holdingsRecordId: folioInstance.holdingId,
                materialType: { id: sharedMaterialType1.id },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                folioInstance.itemIds.push(item.id);
              });
              cy.wait(1000);
              // item with local material type
              InventoryItems.createItemViaApi({
                barcode: folioInstance.itemWithLocalMaterialTypeBarcode,
                holdingsRecordId: folioInstance.holdingId,
                materialType: { id: localMaterialType.id },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                folioInstance.itemIds.push(item.id);
              });
              cy.wait(1000);
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
          // the user is created in central, so login lands on the central tenant —
          // switch the active affiliation to the member tenant to run the bulk edit there
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          BulkEditSearchPane.waitLoading();
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.uuid);
        MaterialTypes.deleteMaterialTypesViaApi(localMaterialType.id);
        cy.resetTenant();
        cy.getAdminToken();
        MaterialTypesConsortiumManager.deleteViaApi(sharedMaterialType1);
        MaterialTypesConsortiumManager.deleteViaApi(sharedMaterialType2);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C1348706 Verify "Replace with" action for Items material type in Member tenant (firebird)',
        { tags: ['smokeECS', 'firebird', 'C1348706'] },
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

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.itemWithSharedMaterialTypeBarcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            sharedMaterialType1.payload.name,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.itemWithLocalMaterialTypeBarcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            localMaterialType.name,
          );
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 1: Download matched records (CSV)
          BulkEditActions.downloadMatchedResults();
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            folioInstance.itemWithSharedMaterialTypeBarcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            sharedMaterialType1.payload.name,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            folioInstance.itemWithLocalMaterialTypeBarcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            localMaterialType.name,
          );

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

          // Step 6: Both shared and local material types are populated in the list
          BulkEditActions.openSelectMaterialTypeDropdown();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            sharedMaterialType1.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            sharedMaterialType2.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(localMaterialType.name);

          // Step 7: Select material type that differs from current (Shared 2)
          BulkEditActions.clickFilteredOption(sharedMaterialType2.payload.name);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              sharedMaterialType2.payload.name,
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
              sharedMaterialType2.payload.name,
            );
          });

          // Step 10: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);
          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              sharedMaterialType2.payload.name,
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
              sharedMaterialType2.payload.name,
            );
          });

          // Step 12: Verify changes applied to Items in member tenant
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();
          itemBarcodes.forEach((barcode) => {
            InventorySearchAndFilter.searchByParameter('Barcode', barcode);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyMaterialType(sharedMaterialType2.payload.name);
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
