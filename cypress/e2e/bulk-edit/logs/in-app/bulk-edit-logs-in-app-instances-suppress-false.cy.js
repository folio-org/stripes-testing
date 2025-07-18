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
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

let user;
let instanceTypeId;
let holdingTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const instances = {
  folio: {
    instance: {
      title: `AT_C435891_FolioInstance_${getRandomPostfix()}`,
      hasHolding: false,
      hasItem: false,
    },
    instanceWithHolding: {
      title: `AT_C435891_FolioInstance_with_holding${getRandomPostfix()}`,
      hasHolding: true,
      hasItem: false,
    },
    instanceWithHoldingAndItem: {
      title: `AT_C435891_FolioInstance_with_holding_and_item${getRandomPostfix()}`,
      hasHolding: true,
      hasItem: true,
    },
  },
  marc: {
    instance: {
      title: `AT_C435891_MarcInstance_${getRandomPostfix()}`,
      hasHolding: false,
      hasItem: false,
    },
    instanceWithHolding: {
      title: `AT_C435891_MarcInstance_with_holding${getRandomPostfix()}`,
      hasHolding: true,
      hasItem: false,
    },
    instanceWithHoldingAndItem: {
      title: `AT_C435891_MarcInstance_with_holding_and_item${getRandomPostfix()}`,
      hasHolding: true,
      hasItem: true,
    },
  },
};
const actionOptions = {
  setFalse: 'Set false',
  setTrue: 'Set true',
};
const warningMessageForInstanceWithoutItems = 'No change in value required';
const warningMessageForInstanceWithItems =
  'No change in value for instance required, suppressed associated records have been updated.';
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
                  title: instances.folio.instance.title,
                },
              }).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                instances.folio.instance.id = instanceId;
                cy.wait(1000);
                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  instances.folio.instance.hrid = instanceData.hrid;
                  cy.wait(500);
                });
              });
            })
            .then(() => {
              // FOLIO instance with holding
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: instances.folio.instanceWithHolding.title,
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
                instances.folio.instanceWithHolding.id = instanceId;
                cy.wait(1000);
                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  instances.folio.instanceWithHolding.hrid = instanceData.hrid;
                  cy.wait(500);
                });
              });
            })
            .then(() => {
              // FOLIO instance with holding and item
              cy.createInstance({
                instance: {
                  instanceTypeId,
                  title: instances.folio.instanceWithHoldingAndItem.title,
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
                      barcode: getRandomPostfix(),
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                      discoverySuppress: true,
                    },
                  ],
                ],
              }).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                instances.folio.instanceWithHoldingAndItem.id = instanceId;
                cy.wait(1000);
                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  instances.folio.instanceWithHoldingAndItem.hrid = instanceData.hrid;
                  cy.wait(500);
                });
              });
            })
            .then(() => {
              // MARC instance without holding
              cy.createSimpleMarcBibViaAPI(instances.marc.instance.title).then((instanceId) => {
                createdInstanceIds.push(instanceId);
                instances.marc.instance.id = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  instances.marc.instance.hrid = instanceData.hrid;
                });
              });
            })
            .then(() => {
              // MARC instance with holding
              cy.createSimpleMarcBibViaAPI(instances.marc.instanceWithHolding.title).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                  instances.marc.instanceWithHolding.id = instanceId;
                  cy.getInstanceById(instanceId).then((instanceData) => {
                    createdInstanceHrids.push(instanceData.hrid);
                    instances.marc.instanceWithHolding.hrid = instanceData.hrid;
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
              cy.createSimpleMarcBibViaAPI(instances.marc.instanceWithHoldingAndItem.title).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                  instances.marc.instanceWithHoldingAndItem.id = instanceId;
                  cy.getInstanceById(instanceId).then((instanceData) => {
                    createdInstanceHrids.push(instanceData.hrid);
                    instances.marc.instanceWithHoldingAndItem.hrid = instanceData.hrid;
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
                        barcode: getRandomPostfix(),
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

          const instanceHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'false',
            },
          ];

          createdInstanceHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              instanceHeaderValues,
            );
          });

          // Step 4: Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const instanceHeaderValuesInFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: false,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: false,
            },
          ];

          createdInstanceHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              instanceHeaderValuesInFile,
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
              instanceHeaderValues,
            );
          });

          // Step 11: Download preview
          BulkEditActions.downloadPreview();

          createdInstanceHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              instanceHeaderValuesInFile,
            );
          });

          // Step 12: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(0);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(6);
          BulkEditSearchPane.verifyErrorLabel(0, 6);

          // Step 13: Check the table populated with Top 10 warnings
          const allInstanceObjects = [
            ...Object.values(instances.folio),
            ...Object.values(instances.marc),
          ];

          allInstanceObjects.forEach((instance) => {
            if (!instance.hasItem) {
              BulkEditSearchPane.verifyErrorByIdentifier(
                instance.id,
                warningMessageForInstanceWithoutItems,
                'Warning',
              );
            } else {
              BulkEditSearchPane.verifyErrorByIdentifier(
                instance.id,
                warningMessageForInstanceWithItems,
                'Warning',
              );
            }
          });

          // Step 14: Download errors (warnings)
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();

          allInstanceObjects.forEach((instance) => {
            if (!instance.hasItem) {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `WARNING,${instance.id},${warningMessageForInstanceWithoutItems}`,
              ]);
            } else {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `WARNING,${instance.id},${warningMessageForInstanceWithItems}`,
              ]);
            }
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
              instanceHeaderValuesInFile,
            );
          });

          // Step 20: Click on the "File with the preview of proposed changes (CSV)" hyperlink
          BulkEditLogs.downloadFileWithProposedChanges();

          createdInstanceHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              hrid,
              instanceHeaderValuesInFile,
            );
          });

          // Step 21: Click on the "File with errors encountered when committing the changes" hyperlink
          BulkEditLogs.downloadFileWithCommitErrors();

          allInstanceObjects.forEach((instance) => {
            if (!instance.hasItem) {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `WARNING,${instance.id},${warningMessageForInstanceWithoutItems}`,
              ]);
            } else {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `WARNING,${instance.id},${warningMessageForInstanceWithItems}`,
              ]);
            }
          });

          // Step 22: Inventory verification
          allInstanceObjects.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByHRID(instance.hrid);
            InventoryInstances.selectInstance();
            cy.wait(1000);
            InstanceRecordView.verifyNotMarkAsStaffSuppressed();

            if (instance.hasHolding) {
              InventorySearchAndFilter.selectViewHoldings();
              HoldingsRecordView.waitLoading();
              cy.wait(2000);
              HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
              HoldingsRecordView.close();

              if (instance.hasItem) {
                InventoryInstance.openHoldings(['']);
                InventoryInstance.openItemByStatus(ITEM_STATUS_NAMES.AVAILABLE);
                ItemRecordView.waitLoading();
                ItemRecordView.suppressedAsDiscoveryIsAbsent();
              }
            }
          });
        },
      );
    });
  });
});
