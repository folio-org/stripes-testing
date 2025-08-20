import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
const instanceIds = [];
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditInstances.gui,
];
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const newAdministrativeNote = 'Admin note added in Inventory';
const dissertationNote = 'Dissertation note added during Bulk Edit';
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const errorMessage =
  'The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. View latest version';

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, userPermissions);

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              for (let i = 0; i < 2; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `AT_C594342_FolioInstance_${getRandomPostfix()}`,
                  },
                }).then((createdInstanceData) => {
                  instanceIds.push(createdInstanceData.instanceId);
                });
              }
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${instanceIds.join('\n')}`,
              );
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instanceIds.forEach((instanceId) => {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });

        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C594342 Verify user-friendly optimistic locking error message for Instance in Member tenant (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C594342'] },
        () => {
          // Step 1: Select "Inventory - instances" radio button and Instance UUIDs
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload CSV file with Instance UUIDs
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Verify upload results
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          );

          instanceIds.forEach((instanceId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instanceId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
            );
          });

          // Step 4: Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          instanceIds.forEach((instanceId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
            );
          });

          // Step 5: Check checkbox for Instance UUID if not checked
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          );

          instanceIds.forEach((instanceId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instanceId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
            );
          });

          // Step 6-8: Navigate to Inventory and edit the first instance
          const instanceToEditIdInInventoryId = instanceIds[0];

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchInstanceByTitle(instanceToEditIdInInventoryId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstancePaneExists();

          // Edit the instance to create version conflict
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addAdministrativeNote(newAdministrativeNote);
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifyInstancePaneExists();

          // Step 9: Return to Bulk edit
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');

          // Step 10: Open In-app bulk edit form
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 11: Select option and action to modify instances
          BulkEditActions.addItemNote('Dissertation note', dissertationNote);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 12: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instanceIds.forEach((instanceId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instanceId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              dissertationNote,
            );
          });

          // Step 13: Download preview
          BulkEditActions.downloadPreview();

          instanceIds.forEach((instanceId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instanceId,
              'Notes',
              `Dissertation note;${dissertationNote};false`,
            );
          });

          // Step 14: Commit changes and verify optimistic locking error
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);

          const instanceEditedDuringBulkEditId = instanceIds[1];

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            instanceEditedDuringBulkEditId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            dissertationNote,
          );
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          // Step 15: Verify error details
          // need current url to go back to Bulk Edit page after Instance verification in Inventory app
          cy.url().then((bulkEditUrl) => {
            BulkEditSearchPane.verifyNonMatchedResults(instanceToEditIdInInventoryId, errorMessage);

            // Step 16: Click on View latest version active text
            BulkEditSearchPane.clickViewLatestVersionInErrorsAccordionByIdentifier(
              instanceToEditIdInInventoryId,
            );
            InventorySearchAndFilter.waitLoading();
            InstanceRecordView.verifyInstancePaneExists();
            InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(dissertationNote);

            // Step 17: Download changed records
            // workaround to go back to Bulk Edit page
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

            // Step 18-19: Download errors CSV
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `ERROR,${instanceToEditIdInInventoryId},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${instanceToEditIdInInventoryId}`,
            ]);

            // Step 20: Verify changes were applied to the instance not affected by optimistic locking
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
