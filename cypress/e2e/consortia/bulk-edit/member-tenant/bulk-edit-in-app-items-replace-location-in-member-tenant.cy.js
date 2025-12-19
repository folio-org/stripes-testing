import { including } from '@interactors/html';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectPermanentLocationModal from '../../../../support/fragments/bulk-edit/select-location-modal';
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
  CAMPUS_NAMES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let loanTypeId;
let materialTypeId;
let sourceId;
let locationData;
let altLocationData;
const folioInstance = {
  title: `AT_C566172_FolioInstance_${getRandomPostfix()}`,
  barcode: `barcode_${getRandomPostfix()}`,
  itemId: '',
  holdingId: '',
};
const marcInstance = {
  title: `AT_C566172_MarcInstance_${getRandomPostfix()}`,
  barcode: `barcode__${getRandomPostfix()}`,
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
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          // Get two locations for testing replace
          InventoryInstances.getLocations({ query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` }).then(
            (resp) => {
              locationData = resp[0];
              locationData.campusName = CAMPUS_NAMES.CITY_CAMPUS;

              InventoryInstances.getLocations({
                query: `name=${LOCATION_NAMES.SECOND_FLOOR_UI}`,
              }).then((altLocationResp) => {
                altLocationData = altLocationResp[0];
                altLocationData.campusName = CAMPUS_NAMES.CITY_CAMPUS;

                Institutions.getInstitutionByIdViaApi(altLocationData.institutionId).then(
                  (institution) => {
                    altLocationData.institutionName = institution.name;
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
                    // create items for both holdings
                    cy.getMaterialTypes({ limit: 1 }).then((res) => {
                      materialTypeId = res.id;
                      cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                        (resLoan) => {
                          loanTypeId = resLoan[0].id;
                          // One item with both locations, one without
                          InventoryItems.createItemViaApi({
                            barcode: folioInstance.barcode,
                            holdingsRecordId: folioInstance.holdingId,
                            materialType: { id: materialTypeId },
                            permanentLoanType: { id: loanTypeId },
                            permanentLocation: { id: locationData.id, name: locationData.name },
                            temporaryLocation: { id: locationData.id, name: locationData.name },
                            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          }).then((item) => {
                            folioInstance.itemId = item.id;
                          });
                          InventoryItems.createItemViaApi({
                            barcode: marcInstance.barcode,
                            holdingsRecordId: marcInstance.holdingId,
                            materialType: { id: materialTypeId },
                            permanentLoanType: { id: loanTypeId },
                            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          }).then((item) => {
                            marcInstance.itemId = item.id;
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
            },
          );
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
        'C566172 Verify "Replace with" action for Items location in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566172'] },
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
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_EFFECTIVE_LOCATION,
          );
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

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            folioInstance.barcode,
            itemInitialHeaderValues,
          );
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            marcInstance.barcode,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
                value: '',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
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

          // Step 7-10: Select Permanent item location
          BulkEditActions.selectOption('Permanent item location');
          BulkEditSearchPane.verifyInputLabel('Permanent item location');
          BulkEditActions.selectSecondAction('Replace with');
          BulkEditActions.locationLookupExists();
          BulkEditActions.clickLocationLookup();
          BulkEditActions.verifyLocationLookupModal();
          SelectPermanentLocationModal.selectExistingHoldingsLocation(altLocationData);
          BulkEditActions.verifyLocationValue(including(altLocationData.name));
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 11-15: Add new row for Temporary item location
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.replaceTemporaryLocation(altLocationData.name, 'item', 1);
          BulkEditActions.verifyLocationValue(including(altLocationData.name, 1));
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 16: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditActions.verifyAreYouSureForm(2);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: altLocationData.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
              value: altLocationData.name,
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 17: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 18: Commit changes and verify updated records
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.barcode,
              headerValuesToEdit,
            );
          });

          // Step 19: Download changed records
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

          // Step 20: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchByParameter('Barcode', instance.barcode);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyPermanentLocation(altLocationData.name);
            ItemRecordView.verifyTemporaryLocation(altLocationData.name);
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
