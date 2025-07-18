import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';

let user;
let instanceTypeId;
let holdingTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const folioInstanceTitles = {
  instance: `AT_C435891_FolioInstance_${getRandomPostfix()}`,
  instanceWithHolding: `AT_C435891_FolioInstance_with_holding${getRandomPostfix()}`,
  instanceWithHoldingAndItem: `AT_C435891_FolioInstance_with_holding_and_item${getRandomPostfix()}`,
};
const marcInstanceTitles = {
  instance: `AT_C435891_MarcInstance_${getRandomPostfix()}`,
  instanceWithHolding: `AT_C435891_MarcInstance_with_holding${getRandomPostfix()}`,
  instanceWithHoldingAndItem: `AT_C435891_MarcInstance_with_holding_and_item${getRandomPostfix()}`,
};
const actionOptions = {
  setFalse: 'Set false',
  setTrue: 'Set true',
};
const warningMessageForInstanceWithoutItems = 'No change in value required';
const warningMessageForInstanceWithItems =
  'No change in value for instance required, suppressed associated records have been updated.';

const itemBarcodes = [getRandomPostfix(), getRandomPostfix()];
const createdInstanceIds = [];
const createdInstanceHrids = [];
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditView.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // FOLIO instance without holding
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: folioInstanceTitles.instance,
                },
              }).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                cy.wait(1000);
                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  cy.wait(500);
                });
              });
            })
            .then(() => {
              // FOLIO instance with holding
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: folioInstanceTitles.instanceWithHolding,
                },
                holdings: [
                  {
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: locationId,
                    discoverySuppress: true,
                    sourceId,
                  },
                ],
              }).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                cy.wait(1000);
                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  cy.wait(500);
                });
              });
            })
            .then(() => {
              // FOLIO instance with holding and item
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: folioInstanceTitles.instanceWithHoldingAndItem,
                },
                holdings: [
                  {
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: locationId,
                    discoverySuppress: true,
                    sourceId,
                  },
                ],
                items: [
                  [
                    {
                      barcode: itemBarcodes[0],
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                      discoverySuppress: true,
                    },
                  ],
                ],
              }).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                cy.wait(1000);
                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  cy.wait(500);
                });
              });
            })
            .then(() => {
              // MARC instance without holding
              cy.createSimpleMarcBibViaAPI(marcInstanceTitles.instance).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                });
              });
            })
            .then(() => {
              // MARC instance with holding
              cy.createSimpleMarcBibViaAPI(marcInstanceTitles.instanceWithHolding).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                  cy.getInstanceById(instanceId).then((instanceData) => {
                    createdInstanceHrids.push(instanceData.hrid);
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instanceData.id,
                      permanentLocationId: locationId,
                      discoverySuppress: true,
                      sourceId,
                    });
                  });
                },
              );
            })
            .then(() => {
              // MARC instance with holding and item
              cy.createSimpleMarcBibViaAPI(marcInstanceTitles.instanceWithHoldingAndItem).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                  cy.getInstanceById(instanceId).then((instanceData) => {
                    createdInstanceHrids.push(instanceData.hrid);
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instanceData.id,
                      permanentLocationId: locationId,
                      discoverySuppress: true,
                      sourceId,
                    }).then((holdingData) => {
                      cy.createItem({
                        holdingsRecordId: holdingData.id,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        discoverySuppress: true,
                        barcode: itemBarcodes[1],
                      });
                    });
                  });
                },
              );
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                createdInstanceIds.join('\n'),
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
        Users.deleteViaApi(user.userId);

        createdInstanceIds.forEach((instanceId) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        });

        FileManager.deleteFile(`cypress/downloads/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C435891 Verify generated Logs files for Instances suppressed from discovery (Set false) (firebird)',
        { tags: ['extendedPath', 'firebird', 'C435891'] },
        () => {
          // Step 1: Select radio and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload file
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(...createdInstanceHrids);

          // Step 3: Show columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          );

          createdInstanceHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: 'false',
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: 'false',
                },
              ],
            );
          });

          // Step 4: Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          createdInstanceHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: false,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: false,
                },
              ],
            );
          });

          // Step 5: Open FOLIO Instances bulk edit form
          BulkEditActions.openStartBulkEditInstanceForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 6: Select Suppress from discovery
          BulkEditActions.selectOption('Suppress from discovery');
          BulkEditActions.verifyOptionSelected('Suppress from discovery');

          // Step 7: Click on "Select action" dropdown
          BulkEditActions.verifyTheActionOptions(Object.values(actionOptions));

          // Step 8: Select "Set false" action
          BulkEditActions.selectAction(actionOptions.setFalse);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);

          // Step 9: Check checkbox only near "Apply to all items records" label
          BulkEditActions.checkApplyToItemsRecordsCheckbox();
          BulkEditActions.applyToHoldingsRecordsCheckboxExists(false);

          // Step 10: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(createdInstanceIds.length);

          createdInstanceHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: 'false',
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: 'false',
                },
              ],
            );
          });

          // Step 11: Download preview
          BulkEditActions.downloadPreview();

          createdInstanceHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: false,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: false,
                },
              ],
            );
          });

          // Step 12: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(0);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(6);
          BulkEditSearchPane.verifyErrorLabel(0, 6);

          // Step 13: Check the table populated with Top 10 warnings

          const instanceWithItemIds = [createdInstanceIds[2], createdInstanceIds[5]];

          instanceWithItemIds.forEach((instanceId) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instanceId,
              warningMessageForInstanceWithItems,
              'Warning',
            );
          });

          const instanceWithoutItemIds = [
            createdInstanceIds[0],
            createdInstanceIds[1],
            createdInstanceIds[3],
            createdInstanceIds[4],
          ];

          instanceWithoutItemIds.forEach((instanceId) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instanceId,
              warningMessageForInstanceWithoutItems,
              'Warning',
            );
          });

          // Step 14: Download errors (warnings)
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();

          instanceWithItemIds.forEach((instanceId) => {
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `WARNING,${instanceId},${warningMessageForInstanceWithItems}`,
            ]);
          });
          instanceWithoutItemIds.forEach((instanceId) => {
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `WARNING,${instanceId},${warningMessageForInstanceWithoutItems}`,
            ]);
          });

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          // Step 15-16: Go to Logs tab
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();

          // Step 17: Click ... action
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenNoChangesApplied();

          // Step 18: Click on the "File that was used to trigger the bulk edit" hyperlink
          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, createdInstanceIds);

          // Step 19: Click on the "File with matched records" hyperlink
          BulkEditLogs.downloadFileWithMatchingRecords();
          createdInstanceHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: false,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: false,
                },
              ],
            );
          });

          // Step 20: Click on the "File with the preview of proposed changes (CSV)" hyperlink
          BulkEditLogs.downloadFileWithProposedChanges();

          createdInstanceHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: false,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: false,
                },
              ],
            );
          });

          // Step 21: Click on the "File with errors encountered when committing the changes" hyperlink
          BulkEditLogs.downloadFileWithCommitErrors();

          instanceWithItemIds.forEach((instanceId) => {
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `WARNING,${instanceId},${warningMessageForInstanceWithItems}`,
            ]);
          });
          instanceWithoutItemIds.forEach((instanceId) => {
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `WARNING,${instanceId},${warningMessageForInstanceWithoutItems}`,
            ]);
          });

          // Step 22: Inventory verification
          createdInstanceHrids.forEach((instanceHrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
            InventoryInstances.selectInstance();
            cy.wait(1000);
            InstanceRecordView.verifyNotMarkAsStaffSuppressed();
          });

          const instancesWithHolding = [
            createdInstanceHrids[1],
            createdInstanceHrids[2],
            createdInstanceHrids[4],
            createdInstanceHrids[5],
          ];

          instancesWithHolding.forEach((instanceHrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
            InventoryInstances.selectInstance();
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            cy.wait(1000);
            HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();

          itemBarcodes.forEach((itemBarcode) => {
            InventorySearchAndFilter.searchByParameter('Barcode', itemBarcode);
            ItemRecordView.waitLoading();
            cy.wait(1000);
            ItemRecordView.suppressedAsDiscoveryIsAbsent();
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
