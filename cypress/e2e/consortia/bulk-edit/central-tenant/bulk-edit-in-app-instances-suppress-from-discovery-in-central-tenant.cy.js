import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';

let user;
let instanceTypeId;
let collegeLocation;
let universityLocation;
let holdingSource;
const instanceUUIDsFileName = `validInstanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const suppressFromDiscovery = 'Suppress from discovery';
const actions = {
  setFalse: 'Set false',
  setTrue: 'Set true',
};
const folioInstance = {
  title: `AT_C477643_FolioInstance_${getRandomPostfix()}`,
  itemBarcodeInCollege: `folioItemCollege${getRandomPostfix()}`,
  itemBarcodeInUniversity: `folioItemUniversity${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C477643_MarcInstance_${getRandomPostfix()}`,
  itemBarcodeInCollege: `marcItemCollege${getRandomPostfix()}`,
  itemBarcodeInUniversity: `marcItemUniversity${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: [
                permissions.bulkEditEdit.gui,
                permissions.uiInventoryViewCreateEditHoldings.gui,
                permissions.uiInventoryViewCreateEditInstances.gui,
              ],
            });
          });

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // create shared folio instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  folioInstance.hrid = instanceData.hrid;
                });
              });
            })
            .then(() => {
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;

                cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                  marcInstance.hrid = instanceData.hrid;
                });
              });
            })
            .then(() => {
              // create holdings and items in member tenants
              const tenantConfigs = [
                {
                  affiliation: Affiliations.College,
                  locationVar: 'collegeLocation',
                  materialTypeVar: 'collegeMaterialTypeId',
                  loanTypeVar: 'collegeLoanTypeId',
                  holdingIdKey: 'holdingIdInCollege',
                  itemIdKey: 'itemIdInCollege',
                  barcodeKey: 'itemBarcodeInCollege',
                  holdingHridKey: 'holdingHridInCollege',
                },
                {
                  affiliation: Affiliations.University,
                  locationVar: 'universityLocation',
                  materialTypeVar: 'universityMaterialTypeId',
                  loanTypeVar: 'universityLoanTypeId',
                  holdingIdKey: 'holdingIdInUniversity',
                  itemIdKey: 'itemIdInUniversity',
                  barcodeKey: 'itemBarcodeInUniversity',
                  holdingHridKey: 'holdingHridInUniversity',
                },
              ];

              const tenantData = {};

              tenantConfigs.forEach((config) => {
                cy.setTenant(config.affiliation);

                cy.getLocations({ limit: 1 }).then((res) => {
                  tenantData[config.locationVar] = res;
                  if (config.locationVar === 'collegeLocation') collegeLocation = res;
                  if (config.locationVar === 'universityLocation') universityLocation = res;
                });
                cy.getMaterialTypes({ limit: 1 }).then((res) => {
                  tenantData[config.materialTypeVar] = res.id;
                });
                cy.getLoanTypes({ limit: 1 }).then((res) => {
                  tenantData[config.loanTypeVar] = res[0].id;
                });

                InventoryHoldings.getHoldingsFolioSource()
                  .then((holdingSources) => {
                    holdingSource = holdingSources.id;
                  })
                  .then(() => {
                    instances.forEach((instance) => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId: instance.uuid,
                        permanentLocationId: tenantData[config.locationVar].id,
                        sourceId: holdingSource,
                      }).then((holding) => {
                        instance[config.holdingIdKey] = holding.id;

                        cy.getHoldings({ query: `"id"="${holding.id}"` }).then((holdings) => {
                          instance[config.holdingHridKey] = holdings[0].hrid;
                        });
                      });
                      cy.wait(1000);
                    });
                  })
                  .then(() => {
                    instances.forEach((instance) => {
                      InventoryItems.createItemViaApi({
                        barcode: instance[config.barcodeKey],
                        holdingsRecordId: instance[config.holdingIdKey],
                        materialType: { id: tenantData[config.materialTypeVar] },
                        permanentLoanType: { id: tenantData[config.loanTypeVar] },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      }).then((item) => {
                        instance[config.itemIdKey] = item.id;
                      });
                      cy.wait(1000);
                    });
                  });
              });

              cy.then(() => {
                FileManager.createFile(
                  `cypress/fixtures/${instanceUUIDsFileName}`,
                  `${folioInstance.uuid}\r\n${marcInstance.uuid}`,
                );
              });
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        instances.forEach((instance) => {
          InventoryItems.deleteItemViaApi(instance.itemIdInCollege);
          InventoryHoldings.deleteHoldingRecordViaApi(instance.holdingIdInCollege);
        });
        cy.setTenant(Affiliations.University);
        instances.forEach((instance) => {
          InventoryItems.deleteItemViaApi(instance.itemIdInUniversity);
          InventoryHoldings.deleteHoldingRecordViaApi(instance.holdingIdInUniversity);
        });
        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C477643 Verify "Suppress from discovery" action for Instances in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C477643'] },
        () => {
          // Helper function: Verify instances in CSV files
          const verifyInstancesInCSV = (fileName, suppressValue) => {
            instances.forEach((instance) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                fileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.uuid,
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                    value: instance.title,
                  },
                  {
                    header:
                      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                    value: suppressValue,
                  },
                ],
              );
            });
          };

          // Helper function: Verify instances in member tenant inventory
          const verifyInstancesInTenant = (
            fromTenant,
            toTenant,
            location,
            barcodeKey,
            expectSuppressed,
          ) => {
            ConsortiumManager.switchActiveAffiliation(fromTenant, toTenant);

            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.searchInstanceByTitle(instance.title);
              InventoryInstances.selectInstance();
              InventoryInstance.waitLoading();

              if (expectSuppressed) {
                InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();
              } else {
                InstanceRecordView.verifyMarkAsStaffSuppressedWarning(false);
              }

              InventorySearchAndFilter.selectViewHoldings();
              HoldingsRecordView.waitLoading();
              HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
              HoldingsRecordView.close();
              InventoryInstance.openHoldingsAccordion(location.name);
              InventoryInstance.openItemByBarcode(instance[barcodeKey]);
              ItemRecordView.waitLoading();
              ItemRecordView.suppressedAsDiscoveryIsPresent();
              ItemRecordView.closeDetailView();
              InventorySearchAndFilter.resetAll();
            });
          };

          // Step 1: Select "Inventory - instances" radio button => Select "Instance UUIDs" from "Record identifier" dropdown
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload .csv file with valid Instance UUIDs by dragging to "Drag & drop" area
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check the result of uploading - verify "Preview of records matched" shows matched Instances
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
              instance.title,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 4: Click "Actions" menu => Check the "Suppress from discovery" checkbox
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          );
          BulkEditSearchPane.verifyResultColumnTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          );

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
          });

          // Step 5: Click "Actions" menu => Click "Download matched records (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();
          verifyInstancesInCSV(fileNames.matchedRecordsCSV, false);

          // Step 6: Click "Actions" menu => Select "FOLIO Instances" element
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 7: Select "Suppress from discovery" option in "Select option" dropdown
          BulkEditActions.selectOption(suppressFromDiscovery);
          BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);
          BulkEditActions.verifyTheActionOptions(Object.values(actions));

          // Step 8: Select "Set true" option in "Select action" dropdown
          BulkEditActions.selectAction(actions.setTrue);
          BulkEditActions.verifyActionSelected(actions.setTrue);
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const suppressedColumnValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'true',
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.hrid,
              suppressedColumnValues,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);

          // Step 10: Click "Download preview in CSV format" button
          BulkEditActions.downloadPreview();
          verifyInstancesInCSV(fileNames.previewRecordsCSV, true);

          // Step 11: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.hrid,
              suppressedColumnValues,
            );
          });

          // Step 12: Click "Actions" menu => Select "Download changed records (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          verifyInstancesInCSV(fileNames.changedRecordsCSV, true);

          // Step 13: Navigate to "Inventory" app => Search for edited MARC, FOLIO Instances => Verify changes applied
          verifyInstancesInTenant(
            tenantNames.central,
            tenantNames.college,
            collegeLocation,
            'itemBarcodeInCollege',
            true,
          );
          verifyInstancesInTenant(
            tenantNames.college,
            tenantNames.university,
            universityLocation,
            'itemBarcodeInUniversity',
            true,
          );

          // remove earlier downloaded files
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          // Step 14: Go back to "Bulk edit" app => Repeat Steps 1-7
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
              instance.title,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          );

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              'true',
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();
          verifyInstancesInCSV(fileNames.matchedRecordsCSV, true);
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.selectOption(suppressFromDiscovery);
          BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);

          // Step 15: Select "Set false" option in "Select action" dropdown
          BulkEditActions.selectAction(actions.setFalse);
          BulkEditActions.verifyActionSelected(actions.setFalse);
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 16: Click "Confirm changes" button
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const notSuppressedColumnValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'false',
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              instance.hrid,
              notSuppressedColumnValues,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          // Step 17: Click "Download preview in CSV format" button
          BulkEditActions.downloadPreview();
          verifyInstancesInCSV(fileNames.previewRecordsCSV, false);

          // Step 18: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.hrid,
              notSuppressedColumnValues,
            );
          });

          // Step 19: Click "Actions" menu => Select "Download changed records (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          verifyInstancesInCSV(fileNames.changedRecordsCSV, false);

          // Step 20: Navigate to "Inventory" app => Verify changes applied to Instances only, Holdings/Items remain suppressed
          verifyInstancesInTenant(
            tenantNames.central,
            tenantNames.college,
            collegeLocation,
            'itemBarcodeInCollege',
            false,
          );
          verifyInstancesInTenant(
            tenantNames.college,
            tenantNames.university,
            universityLocation,
            'itemBarcodeInUniversity',
            false,
          );
        },
      );
    });
  });
});
