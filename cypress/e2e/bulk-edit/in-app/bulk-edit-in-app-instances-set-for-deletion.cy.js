import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const testInstances = [
  {
    type: 'FOLIO',
    title: `AT_C831955_FolioInstance1_${getRandomPostfix()}`,
    initialState: {
      discoverySuppress: false,
      staffSuppress: false,
      deleted: false,
    },
  },
  {
    type: 'FOLIO',
    title: `AT_C831955_FolioInstance2_${getRandomPostfix()}`,
    initialState: {
      discoverySuppress: true,
      staffSuppress: true,
      deleted: false,
    },
  },
  {
    type: 'MARC',
    title: `AT_C831955_MarcInstance3_${getRandomPostfix()}`,
    initialState: {
      discoverySuppress: false,
      staffSuppress: true,
      deleted: false,
    },
  },
  {
    type: 'MARC',
    title: `AT_C831955_MarcInstance4_${getRandomPostfix()}`,
    initialState: {
      discoverySuppress: true,
      staffSuppress: false,
      deleted: false,
    },
  },
  {
    type: 'MARC',
    title: `AT_C831955_MarcInstance5_${getRandomPostfix()}`,
    initialState: {
      discoverySuppress: true,
      staffSuppress: true,
      deleted: true,
    },
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiInventorySetRecordsForDeletion.gui,
        permissions.enableStaffSuppressFacet.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            // Create instances
            testInstances.forEach((instanceData) => {
              if (instanceData.type === 'FOLIO') {
                // Create FOLIO instance with initial state
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceData.title,
                    discoverySuppress: instanceData.initialState.discoverySuppress,
                    staffSuppress: instanceData.initialState.staffSuppress,
                  },
                }).then((createdInstanceData) => {
                  instanceData.instanceId = createdInstanceData.instanceId;

                  // Get HRID for the instance
                  cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                    instanceData.instanceHrid = instance.hrid;

                    // Set deleted status if needed
                    if (instanceData.initialState.deleted) {
                      instance.deleted = true;
                      cy.updateInstance(instance);
                    }
                  });
                });
              } else {
                // Create MARC instance
                cy.createSimpleMarcBibViaAPI(instanceData.title).then((instanceId) => {
                  instanceData.instanceId = instanceId;

                  cy.getInstanceById(instanceId).then((instance) => {
                    instanceData.instanceHrid = instance.hrid;

                    // Update MARC instance with initial state
                    instance.discoverySuppress = instanceData.initialState.discoverySuppress;
                    instance.staffSuppress = instanceData.initialState.staffSuppress;

                    if (instanceData.initialState.deleted) {
                      instance.deleted = true;
                    }

                    cy.updateInstance(instance);
                  });
                });
              }
            });
          })
          .then(() => {
            const instanceIds = testInstances.map((instance) => instance.instanceId).join('\n');

            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instanceIds);

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      testInstances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C831955 Verify Set true for deletion of Instances via FOLIO flow (firebird)',
      { tags: ['smoke', 'firebird', 'C831955'] },
      () => {
        // Step 1: Check the result of uploading the .csv file with Instances UUIDs
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('5 instance');
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          false,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
        );

        // Step 2: Show Set for deletion and Staff suppress columns
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
        );

        // Step 3: Check display of Instance data from Preconditions in the "Preview of records matched" table
        testInstances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            instance.instanceHrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
                value: instance.initialState.deleted.toString(),
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                value: instance.initialState.staffSuppress.toString(),
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                value: instance.initialState.discoverySuppress.toString(),
              },
            ],
          );
        });

        // Step 4: Download matched records and verify CSV content
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        testInstances.forEach((instance) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
            instance.initialState.deleted,
          );
        });

        // The file contains “Set for deletion” column located after “Previously held” and before “Instance HRID”
        ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD},${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION},${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID}`,
        ]);

        // Step 5: Hide columns
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          false,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
        );

        // Step 6: Start bulk edit process
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();

        // Step 7: Select "Set records for deletion" option and "Set true" action
        BulkEditActions.selectOption('Set records for deletion');
        BulkEditActions.selectAction('Set true');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Add "Suppress from discovery" option
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Suppress from discovery', 1);
        BulkEditActions.verifyActionSelected('Set true', 1);
        BulkEditActions.verifyActionsSelectDropdownDisabled(1);
        BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 9: Add "Staff suppress" option
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Staff suppress', 2);
        BulkEditActions.verifyActionSelected('Set true', 2);
        BulkEditActions.verifyActionsSelectDropdownDisabled(2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 10: Remove the added rows and confirm changes
        BulkEditActions.deleteRow(2);
        BulkEditActions.deleteRow(1);
        BulkEditActions.confirmChanges();

        // Verify "Are you sure?" form
        BulkEditActions.verifyMessageBannerInAreYouSureForm(5);
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
            value: 'true',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            value: 'true',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            value: 'true',
          },
        ];

        // Verify preview shows all instances will be set for deletion
        testInstances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            instance.instanceHrid,
            editedHeaderValues,
          );
        });

        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(5);

        // Step 11: Download preview and verify content
        BulkEditActions.downloadPreview();

        const editedHeaderValuesForFile = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
            value: true,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            value: true,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            value: true,
          },
        ];

        testInstances.forEach((instance) => {
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            editedHeaderValuesForFile,
          );
        });

        // The file contains “Set for deletion” column located after “Previously held” and before “Instance HRID”
        ExportFile.verifyFileIncludes(fileNames.previewRecordsCSV, [
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD},${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION},${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID}`,
        ]);

        // Step 12: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(4);

        // Verify changed records
        testInstances.forEach((instance) => {
          if (instance.title.includes('Instance5')) {
            // Instance 5 should show "No change in value required" for deletion
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.instanceId,
              ERROR_MESSAGES.NO_CHANGE_REQUIRED,
              'Warning',
            );
          } else {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.instanceHrid,
              editedHeaderValues,
            );
          }
        });

        // Step 13: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        testInstances.forEach((instance) => {
          if (!instance.title.includes('Instance5')) {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.instanceHrid,
              editedHeaderValuesForFile,
            );
          }
        });

        // The file contains “Set for deletion” column located after “Previously held” and before “Instance HRID”
        ExportFile.verifyFileIncludes(fileNames.changedRecordsCSV, [
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD},${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION},${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID}`,
        ]);

        // Step 14: Download errors
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `WARNING,${testInstances[4].instanceId},No change in value required`,
        ]);

        // Step 15: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

        testInstances.forEach((instance) => {
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
          InventorySearchAndFilter.searchInstanceByTitle(instance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Verify instance is marked for deletion
          InstanceRecordView.verifyInstanceIsSetForDeletion();
          InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
          InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
          InventorySearchAndFilter.resetAll();
        });

        // Step 16: For MARC instances, verify source records
        testInstances
          .filter((instance) => instance.type === 'MARC')
          .forEach((instance) => {
            InventorySearchAndFilter.selectYesfilterStaffSuppress();
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryViewSource.waitLoading();

            // Verify LDR05 is set to 'd'
            InventoryViewSource.checkFieldContentMatch('LDR', /^LEADER \d{5}d/);
            InventoryViewSource.close();
            InventorySearchAndFilter.resetAll();
          });
      },
    );
  });
});
