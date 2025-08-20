import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
import LoanTypes from '../../../../support/fragments/settings/inventory/items/loanTypes';
import LoanTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/items/loanTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let materialTypeId;
let sourceId;
let sharedLoanTypeData;
const localLoanTypeData = {
  name: `AT_C566176_LocalLoanType_${getRandomPostfix()}`,
};
const folioInstance = {
  title: `AT_C566176_FolioInstance_${getRandomPostfix()}`,
  barcode: `barcode_${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
};
const marcInstance = {
  title: `AT_C566176_MarcInstance_${getRandomPostfix()}`,
  barcode: `barcode_${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
};
const instances = [folioInstance, marcInstance];
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // Create shared loan type in central tenant
        LoanTypesConsortiumManager.createViaApi({
          payload: {
            name: `AT_C566176_SharedLoanType_${getRandomPostfix()}`,
          },
        })
          .then((sharedLoanType) => {
            sharedLoanTypeData = sharedLoanType;
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.createTempUser([
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditItems.gui,
            ]).then((userProperties) => {
              user = userProperties;

              // Create local loan type in member tenant
              LoanTypes.createLoanTypesViaApi(localLoanTypeData).then((localLoanTypeId) => {
                localLoanTypeData.id = localLoanTypeId;
              });
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                instanceTypeId = instanceTypeData[0].id;
              });
              cy.getLocations({ query: 'name="DCB"' }).then((res) => {
                locationId = res.id;
              });
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
              InventoryHoldings.getHoldingsFolioSource()
                .then((folioSource) => {
                  sourceId = folioSource.id;
                })
                .then(() => {
                  // Create folio and marc instances, holdings, and items in member tenant
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: folioInstance.title,
                    },
                  }).then((createdInstanceData) => {
                    folioInstance.id = createdInstanceData.instanceId;
                  });
                  cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                    marcInstance.id = instanceId;
                  });
                })
                .then(() => {
                  instances.forEach((instance) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.id,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holding) => {
                      instance.holdingId = holding.id;
                    });
                    cy.wait(1000);
                  });
                })
                .then(() => {
                  // Create items with different loan types
                  InventoryItems.createItemViaApi({
                    barcode: folioInstance.barcode,
                    holdingsRecordId: folioInstance.holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: localLoanTypeData.id },
                    temporaryLoanType: { id: sharedLoanTypeData.settingId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    folioInstance.itemId = item.id;
                  });
                  InventoryItems.createItemViaApi({
                    barcode: marcInstance.barcode,
                    holdingsRecordId: marcInstance.holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: localLoanTypeData.id },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    marcInstance.itemId = item.id;
                  });
                })
                .then(() => {
                  // Create .csv file with item UUIDs
                  FileManager.createFile(
                    `cypress/fixtures/${itemUUIDsFileName}`,
                    `${folioInstance.itemId}\n${marcInstance.itemId}`,
                  );
                  cy.login(user.username, user.password, {
                    path: TopMenu.bulkEditPath,
                    waiter: BulkEditSearchPane.waitLoading,
                  });
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                });
            });
          });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        });

        LoanTypes.deleteLoanTypesViaApi(localLoanTypeData.id);
        Users.deleteViaApi(user.userId);
        cy.resetTenant();
        LoanTypesConsortiumManager.deleteViaApi(sharedLoanTypeData);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566176 Verify "Replace with" action for Items loan type in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566176'] },
        () => {
          // Step 1: Select record type and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');

          // Step 2: Upload .csv file
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check upload result
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);

          // Step 4: Show columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
          );

          // Step 5: Download matched records
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            folioInstance.barcode,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
                value: localLoanTypeData.name,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
                value: sharedLoanTypeData.payload.name,
              },
            ],
          );
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            marcInstance.barcode,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
                value: localLoanTypeData.name,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
                value: '',
              },
            ],
          );

          // Step 6: Start bulk edit
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 7-9: Select Permanent loan type
          BulkEditActions.fillPermanentLoanType(sharedLoanTypeData.payload.name);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 10-14: Add new row for Temporary loan type
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.fillTemporaryLoanType(localLoanTypeData.name, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 15: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditActions.verifyAreYouSureForm(2);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
              value: sharedLoanTypeData.payload.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
              value: localLoanTypeData.name,
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 16: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 17: Commit changes and verify updated records
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 18: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 19: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchByParameter('Barcode', instance.barcode);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyPermanentLoanType(sharedLoanTypeData.payload.name);
            ItemRecordView.verifyTemporaryLoanType(localLoanTypeData.name);
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
