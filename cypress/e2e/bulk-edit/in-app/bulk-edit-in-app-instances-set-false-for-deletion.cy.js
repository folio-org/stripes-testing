import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
let matchedRecordsQueryFileName;
let previewQueryFileNameCsv;
let changedRecordsQueryFileNameCsv;
let errorsFromCommittingFileName;
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const testInstances = [
  {
    type: 'FOLIO',
    title: `AT_C831958_FolioInstance1_${getRandomPostfix()}`,
    initialState: {
      discoverySuppress: true,
      staffSuppress: true,
      deleted: true,
    },
  },
  {
    type: 'MARC',
    title: `AT_C831958_MarcInstance2_${getRandomPostfix()}`,
    initialState: {
      discoverySuppress: true,
      staffSuppress: true,
      deleted: true,
    },
  },
  {
    type: 'FOLIO',
    title: `AT_C831958_FolioInstance3_${getRandomPostfix()}`,
    initialState: {
      discoverySuppress: true,
      staffSuppress: true,
      deleted: false,
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
        permissions.bulkEditQueryView.gui,
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
            const instanceIds = testInstances.map((instance) => instance.instanceId).join(',');

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });

            // Navigate to Query tab and build query
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkInstanceRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();
            QueryModal.selectField(instanceFieldValues.instanceId);
            QueryModal.selectOperator(QUERY_OPERATIONS.IN);
            QueryModal.fillInValueTextfield(instanceIds);
            cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
            cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();
            cy.wait('@getPreview', getLongDelay()).then((interception) => {
              const interceptedUuid = interception.request.url.match(
                /bulk-operations\/([a-f0-9-]+)\/preview/,
              )[1];
              matchedRecordsQueryFileName = `${todayDate}-Matched-Records-Query-${interceptedUuid}.csv`;
              previewQueryFileNameCsv = `${todayDate}-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
              changedRecordsQueryFileNameCsv = `${todayDate}-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
              errorsFromCommittingFileName = `${todayDate}-Committing-changes-Errors-Query-${interceptedUuid}.csv`;
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

      FileManager.deleteFileFromDownloadsByMask(
        previewQueryFileNameCsv,
        changedRecordsQueryFileNameCsv,
        matchedRecordsQueryFileName,
        errorsFromCommittingFileName,
      );
    });

    it(
      'C831958 Verify Set false for deletion of Instances via FOLIO flow (Query) (firebird)',
      { tags: ['smoke', 'firebird', 'C831958'] },
      () => {
        // Step 1: Show Set for deletion and Staff suppress columns
        BulkEditSearchPane.verifyBulkEditQueryPaneExists();
        BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('3 instance');
        BulkEditActions.openActions();
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

        // Step 2: Check display of Instance data from Preconditions in the "Preview of records matched" table
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

        // Step 3: Download matched records and verify CSV content
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        testInstances.forEach((instance) => {
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsQueryFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
            instance.initialState.deleted,
          );
        });

        // Step 4: Hide columns
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

        // Step 5: Start bulk edit process
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();

        // Step 6: Select "Set records for deletion" option and "Set false" action
        BulkEditActions.selectOption('Set records for deletion');
        BulkEditActions.selectAction('Set false');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Add "Suppress from discovery" option
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Suppress from discovery', 1);
        BulkEditActions.verifyTheActionOptions(['Set false', 'Set true'], 1);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 8: Add "Staff suppress" option
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Staff suppress', 2);
        BulkEditActions.verifyTheActionOptions(['Set false', 'Set true'], 2);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 9: Remove the added rows and confirm changes
        BulkEditActions.deleteRow(2);
        BulkEditActions.deleteRow(1);
        BulkEditActions.confirmChanges();

        // Verify "Are you sure?" form
        BulkEditActions.verifyMessageBannerInAreYouSureForm(3);
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);

        // Verify preview shows all instances will be set false for deletion
        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
            value: 'false',
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

        testInstances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            instance.instanceHrid,
            editedHeaderValues,
          );
        });

        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(3);

        // Step 10: Download preview and verify content
        BulkEditActions.downloadPreview();

        const editedHeaderValuesForFile = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
            value: false,
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
            previewQueryFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            editedHeaderValuesForFile,
          );
        });

        // Step 11: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);

        // Verify changed records
        testInstances.forEach((instance) => {
          if (instance.title.includes('Instance3')) {
            // Instance 3 should show "No change in value required" for deletion
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.instanceId,
              'No change in value required',
              'Warning',
            );
          } else {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.instanceHrid,
              editedHeaderValues,
            );
          }
        });

        // Step 12: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        // Verify only instances that actually changed (Instance3 had no change)
        const changedInstances = testInstances.filter(
          (instance) => !instance.title.includes('Instance3'),
        );

        changedInstances.forEach((instance) => {
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            changedRecordsQueryFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.instanceHrid,
            editedHeaderValuesForFile,
          );
        });

        // Step 13: Download errors
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
          `WARNING,${testInstances[2].instanceId},No change in value required`,
        ]);

        // Step 14: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

        testInstances.forEach((instance) => {
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
          InventorySearchAndFilter.searchInstanceByTitle(instance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Verify instance is NOT marked for deletion (set false for deletion)
          InstanceRecordView.verifyInstanceIsSetForDeletion(false);
          InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
          InventorySearchAndFilter.resetAll();
        });

        // Step 15: For MARC instances, verify source records
        testInstances
          .filter((instance) => instance.type === 'MARC')
          .forEach((instance) => {
            InventorySearchAndFilter.selectYesfilterStaffSuppress();
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryViewSource.waitLoading();

            // Verify LDR05 is set to 'c' (corrected)
            InventoryViewSource.checkFieldContentMatch('LDR', /^LEADER \d{5}c/);
            InventoryViewSource.close();
            InventorySearchAndFilter.resetAll();
          });
      },
    );
  });
});
