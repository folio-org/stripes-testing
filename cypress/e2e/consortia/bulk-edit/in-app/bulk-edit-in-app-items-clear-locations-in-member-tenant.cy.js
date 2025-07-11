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
import Institutions from '../../../../support/fragments/settings/tenant/location-setup/institutions';
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
let loanTypeId;
let materialTypeId;
let sourceId;
let locationData;
const folioInstance = {
  title: `AT_C566173_FolioInstance_${getRandomPostfix()}`,
  barcode: `barcode_${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
};
const marcInstance = {
  title: `AT_C566173_MarcInstance_${getRandomPostfix()}`,
  barcode: `barcode__${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
};
const instances = [folioInstance, marcInstance];
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          InventoryInstances.getLocations({ limit: 1 }).then((resp) => {
            locationData = resp[0];

            Institutions.getInstitutionByIdViaApi(locationData.institutionId).then(
              (institution) => {
                locationData.institutionName = institution.name;
              },
            );

            InventoryHoldings.getHoldingsFolioSource()
              .then((folioSource) => {
                sourceId = folioSource.id;
              })
              .then(() => {
                // create folio instance
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                }).then((createdInstanceData) => {
                  folioInstance.id = createdInstanceData.instanceId;
                });
              })
              .then(() => {
                // create marc instance
                cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                  marcInstance.id = instanceId;
                });
              })
              .then(() => {
                // create holdings for both instances
                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationData.id,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingId = holding.id;
                  });
                  cy.wait(1000);
                });
              })
              .then(() => {
                // create items for both holdings, both with permanent and temporary location
                cy.getMaterialTypes({ limit: 1 }).then((res) => {
                  materialTypeId = res.id;
                  cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                    (resLoan) => {
                      loanTypeId = resLoan[0].id;
                      instances.forEach((instance) => {
                        InventoryItems.createItemViaApi({
                          barcode: instance.barcode,
                          holdingsRecordId: instance.holdingId,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          permanentLocation: { id: locationData.id, name: locationData.name },
                          temporaryLocation: { id: locationData.id, name: locationData.name },
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        }).then((item) => {
                          instance.itemId = item.id;
                        });
                        cy.wait(1000);
                      });
                    },
                  );
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
        cy.withinTenant(Affiliations.College, () => {
          instances.forEach((instance) => {
            InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
          });
          Users.deleteViaApi(user.userId);
        });
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566173 Verify "Clear" action for Items location in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566173'] },
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
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
          );

          // Step 5: Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const itemInitialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: locationData.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
              value: locationData.name,
            },
          ];

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.barcode,
              itemInitialHeaderValues,
            );
          });

          // Step 6: Start bulk edit
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 7: Select Permanent item location
          BulkEditActions.selectOption('Permanent item location');
          BulkEditSearchPane.verifyInputLabel('Permanent item location');
          BulkEditActions.selectSecondAction('Clear field');
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Add new row for Temporary item location
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.selectOption('Temporary item location', 1);
          BulkEditSearchPane.verifyInputLabel('Temporary item location', 1);
          BulkEditActions.selectSecondAction('Clear field', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditActions.verifyAreYouSureForm(2);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
              value: '',
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 10: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 11: Commit changes and verify updated records
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 12: Download changed records
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

          // Step 13: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchByParameter('Barcode', instance.barcode);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyPermanentLocation('No value set-');
            ItemRecordView.verifyTemporaryLocation('No value set-');
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
