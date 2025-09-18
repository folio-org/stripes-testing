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
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
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
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const instances = {
  folio: [
    {
      title: `AT_C434148_FolioInstance_${getRandomPostfix()}`,
      hasHolding: false,
      hasItem: false,
      suppressedFromDiscovery: false,
      staffSuppress: false,
    },
    {
      title: `AT_C434148_FolioInstance_with_holding${getRandomPostfix()}`,
      hasHolding: true,
      hasItem: false,
      suppressedFromDiscovery: true,
      staffSuppress: false,
    },
    {
      title: `AT_C434148_FolioInstance_with_holding_and_item${getRandomPostfix()}`,
      hasHolding: true,
      hasItem: true,
      suppressedFromDiscovery: false,
      staffSuppress: false,
    },
  ],
  marc: [
    {
      title: `AT_C434148_MarcInstance_${getRandomPostfix()}`,
      hasHolding: false,
      hasItem: false,
      suppressedFromDiscovery: true,
      staffSuppress: false,
    },
    {
      title: `AT_C434148_MarcInstance_with_holding${getRandomPostfix()}`,
      hasHolding: true,
      hasItem: false,
      suppressedFromDiscovery: true,
      staffSuppress: false,
    },
    {
      title: `AT_C434148_MarcInstance_with_holding_and_item${getRandomPostfix()}`,
      hasHolding: true,
      hasItem: true,
      suppressedFromDiscovery: false,
      staffSuppress: false,
    },
  ],
};
const allInstanceObjects = [...instances.folio, ...instances.marc];
const actionOptions = {
  setFalse: 'Set false',
  setTrue: 'Set true',
};
const warningMessageForInstanceWithoutHoldings = 'No change in value required';
const warningMessageForInstanceWithHoldings =
  'No change in value for instance required, unsuppressed associated records have been updated.';
const instanceUUIDsFileName = `instanceHRIDs_${getRandomPostfix()}.csv`;
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
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // Create FOLIO instances
              instances.folio.forEach((instance) => {
                cy.createInstance({
                  instance: {
                    instanceTypeId,
                    title: instance.title,
                  },
                }).then((instanceId) => {
                  instance.id = instanceId;
                  cy.wait(1000);
                  cy.getInstanceById(instanceId).then((instanceData) => {
                    instance.hrid = instanceData.hrid;
                    cy.wait(500);
                  });
                });
              });
            })
            .then(() => {
              // Create MARC instances
              instances.marc.forEach((instance) => {
                cy.createSimpleMarcBibViaAPI(instance.title).then((instanceId) => {
                  instance.id = instanceId;
                  cy.getInstanceById(instanceId).then((instanceData) => {
                    instance.hrid = instanceData.hrid;
                  });
                });
              });
            })
            .then(() => {
              // Create holdings and items
              allInstanceObjects.forEach((instance) => {
                if (instance.hasHolding) {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationId,
                    discoverySuppress: false,
                    sourceId,
                  }).then((holdingData) => {
                    if (instance.hasItem) {
                      cy.createItem({
                        holdingsRecordId: holdingData.id,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        discoverySuppress: false,
                        barcode: getRandomPostfix(),
                      });
                    }
                  });
                }
              });
            })
            .then(() => {
              // Set suppression flags for all instances
              allInstanceObjects.forEach((instance) => {
                cy.getInstanceById(instance.id).then((body) => {
                  body.discoverySuppress = instance.suppressedFromDiscovery;
                  cy.updateInstance(body);
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                allInstanceObjects.map((instance) => instance.hrid).join('\n'),
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

        allInstanceObjects.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        });

        FileManager.deleteFileFromDownloadsByMask(instanceUUIDsFileName);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C434148 Verify generated Logs files for Instances suppressed from discovery (Set true) (firebird)',
        { tags: ['extendedPath', 'firebird', 'C434148'] },
        () => {
          // Step 1: Select radio and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');

          // Step 2: Upload file
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          const createdInstanceHrids = allInstanceObjects.map((instance) => instance.hrid);

          BulkEditSearchPane.verifyMatchedResults(...createdInstanceHrids);

          // Step 3: Show columns
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          );

          allInstanceObjects.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: String(instance.suppressedFromDiscovery),
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: String(instance.staffSuppress),
                },
              ],
            );
          });

          // Step 4: Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          allInstanceObjects.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: instance.suppressedFromDiscovery,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: instance.staffSuppress,
                },
              ],
            );
          });

          // Step 5: Open FOLIO Instances bulk edit form
          BulkEditActions.openStartBulkEditFolioInstanceForm();
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

          // Step 8: Select "Set true" action
          BulkEditActions.selectSecondAction(actionOptions.setTrue);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Uncheck checkbox only near "Apply to all items records" label
          BulkEditActions.checkApplyToItemsRecordsCheckbox();
          BulkEditActions.applyToHoldingsRecordsCheckboxExists(true);
          BulkEditActions.applyToItemsRecordsCheckboxExists(false);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 10: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(6);

          allInstanceObjects.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              'true',
            );
          });

          BulkEditActions.verifyAreYouSureForm(6);

          // Step 11: Download preview
          BulkEditActions.downloadPreview();

          allInstanceObjects.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              true,
            );
          });

          // Step 12: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(3);

          allInstanceObjects.forEach((instance) => {
            if (!instance.suppressedFromDiscovery) {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                'true',
              );
            }
          });

          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(3);
          BulkEditSearchPane.verifyErrorLabel(0, 3);

          // Step 13: Check the table populated with Top 10 warnings
          allInstanceObjects.forEach((instance) => {
            if (instance.suppressedFromDiscovery && !instance.hasHolding) {
              BulkEditSearchPane.verifyErrorByIdentifier(
                instance.hrid,
                warningMessageForInstanceWithoutHoldings,
                'Warning',
              );
            } else if (instance.suppressedFromDiscovery && instance.hasHolding) {
              BulkEditSearchPane.verifyErrorByIdentifier(
                instance.hrid,
                warningMessageForInstanceWithHoldings,
                'Warning',
              );
            }
          });

          // Step 14: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          allInstanceObjects.forEach((instance) => {
            if (!instance.suppressedFromDiscovery) {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.changedRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                true,
              );
            }
          });

          // Step 15: Download errors (warnings)
          BulkEditActions.downloadErrors();

          allInstanceObjects.forEach((instance) => {
            if (instance.suppressedFromDiscovery && !instance.hasHolding) {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `WARNING,${instance.hrid},${warningMessageForInstanceWithoutHoldings}`,
              ]);
            } else if (instance.suppressedFromDiscovery && instance.hasHolding) {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `WARNING,${instance.hrid},${warningMessageForInstanceWithHoldings}`,
              ]);
            }
          });

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          // Step 16-17: Go to Logs tab
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();

          // Step 18: Click on "User" accordion on "Set criteria" pane
          BulkEditLogs.clickUserAccordion();

          // Step 19: Click on the "Choose user" dropdown under "User" accordion
          BulkEditLogs.clickChooseUserUnderUserAccordion();
          BulkEditLogs.verifyUserIsInUserList(user.username);

          // Step 20: Uncheck  "Inventory - Instances" checkbox under "Record types" accordion on "Set criteria" pane
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.verifyLogsPane();

          // 21 Click on "User" accordion on "Set criteria" pane
          BulkEditLogs.verifyUserIsInUserList(user.username);

          // Step 22: Check "Inventory - Instances" checkbox under "Record types"  accordion to retrieve Bulk edit job result list
          BulkEditLogs.checkInstancesCheckbox();

          // Step 23: Click ... action
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrors();

          // Step 24: Click on the "File that was used to trigger the bulk edit" hyperlink
          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, createdInstanceHrids);

          // Step 25: Click on the "File with the matching records" hyperlink
          BulkEditLogs.downloadFileWithMatchingRecords();

          allInstanceObjects.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.hrid,
              [
                {
                  header:
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                  value: instance.suppressedFromDiscovery,
                },
                {
                  header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                  value: instance.staffSuppress,
                },
              ],
            );
          });

          // Step 26: Click on the "File with the preview of proposed changes (CSV)" hyperlink
          BulkEditLogs.downloadFileWithProposedChanges();

          allInstanceObjects.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              true,
            );
          });

          // Step 27: Click on the "File with the updated records (CSV)" hyperlink
          BulkEditLogs.downloadFileWithUpdatedRecords();

          allInstanceObjects.forEach((instance) => {
            if (!instance.suppressedFromDiscovery) {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.changedRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                true,
              );
            }
          });

          // Step 28: Click on the "File with errors encountered when committing the changes" hyperlink
          BulkEditLogs.downloadFileWithCommitErrors();

          allInstanceObjects.forEach((instance) => {
            if (instance.suppressedFromDiscovery && !instance.hasHolding) {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `WARNING,${instance.hrid},${warningMessageForInstanceWithoutHoldings}`,
              ]);
            } else if (instance.suppressedFromDiscovery && instance.hasHolding) {
              ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
                `WARNING,${instance.hrid},${warningMessageForInstanceWithHoldings}`,
              ]);
            }
          });

          // Step 29: Inventory verification
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

          allInstanceObjects.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByHRID(instance.hrid);
            InventoryInstances.selectInstance();
            cy.wait(1000);
            InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

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
                ItemRecordView.closeDetailView();
              }
            }
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
