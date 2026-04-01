import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let instanceTypeId;
let fileNames;
const instances = [];
const newAdministrativeNote = 'Admin note added in Inventory';
const dissertationNote = 'Dissertation note added during Bulk Edit';
const errorMessage = ERROR_MESSAGES.OPTIMISTIC_LOCKING;

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              for (let i = 0; i < 2; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `AT_C895655_FolioInstance_${getRandomPostfix()}`,
                  },
                }).then((createdInstanceData) => {
                  instances.push(createdInstanceData.instanceId);
                });
              }
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

              // Preconditions 6-7: Build and run query to retrieve instances
              cy.intercept('GET', '**/query/**').as('query');
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('preview');

              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkInstanceRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();

              QueryModal.selectField(instanceFieldValues.instanceId);
              QueryModal.selectOperator(QUERY_OPERATIONS.IN);
              QueryModal.fillInValueTextfield(`${instances[0]}, ${instances[1]}`);

              QueryModal.testQuery();
              QueryModal.waitForQueryCompleted('@query');
              QueryModal.verifyNumberOfMatchedRecords(2);

              QueryModal.clickRunQuery();
              QueryModal.verifyClosed();

              cy.wait('@preview', getLongDelay()).then((interception) => {
                const interceptedUuid = interception.request.url.match(
                  /bulk-operations\/([a-f0-9-]+)\/preview/,
                )[1];
                fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(interceptedUuid, true);

                BulkEditSearchPane.verifyBulkEditQueryPaneExists();
                BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 instance');
              });
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        instances.forEach((instanceId) => {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });

        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C895655 Verify user-friendly optimistic locking error message for Instance in Central tenant (Query) (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C895655'] },
        () => {
          // Step 1: Download matched records (CSV)
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instanceId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
            );
          });

          // Step 2: Check checkbox for Instance UUID if not checked
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          );

          instances.forEach((instanceId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instanceId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
            );
          });

          // Step 3-5: Navigate to Inventory and edit the first instance
          const instanceToEditId = instances[0];

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchInstanceByTitle(instanceToEditId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstancePaneExists();

          // Edit the instance to create version conflict
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addAdministrativeNote(newAdministrativeNote);
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifyInstancePaneExists();

          // Step 6: Return to Bulk edit
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 instance');

          // Step 7: Open In-app bulk edit form
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 8: Select option and action to modify instances
          BulkEditActions.addItemNote('Dissertation note', dissertationNote);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instances.forEach((instanceId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instanceId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              dissertationNote,
            );
          });

          // Step 10: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instanceId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
              'Notes',
              `Dissertation note;${dissertationNote};false`,
            );
          });

          // Step 11: Commit changes and verify optimistic locking error
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);

          const instanceEditedDuringBulkEditId = instances[1];

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            instanceEditedDuringBulkEditId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            dissertationNote,
          );
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          // Step 12: Verify error details
          cy.url().then((bulkEditUrl) => {
            BulkEditSearchPane.verifyNonMatchedResults(instanceToEditId, errorMessage);

            // Step 13: Click on View latest version active text
            BulkEditSearchPane.clickViewLatestVersionInErrorsAccordionByIdentifier(
              instanceToEditId,
            );
            InventorySearchAndFilter.waitLoading();
            InstanceRecordView.verifyInstancePaneExists();
            InstanceRecordView.verifyAdministrativeNote(newAdministrativeNote);
            InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(dissertationNote);

            // Step 14: Download changed records
            cy.visit(bulkEditUrl);
            BulkEditSearchPane.verifyErrorLabel(1);
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceEditedDuringBulkEditId,
              'Notes',
              `Dissertation note;${dissertationNote};false`,
            );

            // Step 15: Download errors CSV
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `ERROR,${instanceToEditId},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${instanceToEditId}`,
            ]);

            // Step 16: Verify error CSV contains optimistic locking message
            BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 1);

            // Step 17: Verify changes were applied to the instance not affected by optimistic locking
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.waitLoading();
            InventorySearchAndFilter.searchInstanceByTitle(instanceEditedDuringBulkEditId);
            InventoryInstances.selectInstance();
            InstanceRecordView.verifyInstancePaneExists();
            InstanceRecordView.checkNotesByType(0, 'Dissertation note', dissertationNote, 'No');
          });
        },
      );
    });
  });
});
