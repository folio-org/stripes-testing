import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';

let user;
const folioInstance = {
  title: `AT_C566500_FolioInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const generalNoteText = 'General note';
const administrativeNoteText = 'Administrative note for bulk edit test';

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          const instanceTypeId = instanceTypes[0].id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: folioInstance.title,
            },
          }).then((instanceData) => {
            folioInstance.instanceId = instanceData.instanceId;

            cy.getInstanceById(folioInstance.instanceId).then((instance) => {
              folioInstance.instanceHrid = instance.hrid;
            });

            // Create CSV file with instance UUID
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              folioInstance.instanceId,
            );
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C566500 Verify Bulk edit of MARC fields flow for FOLIO Instances (firebird)',
      { tags: ['extendedPath', 'firebird', 'C566500'] },
      () => {
        // Step 1: Check Source column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          folioInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          'FOLIO',
        );

        // Step 2: Open Instances with source MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
        BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
          instanceUUIDsFileName,
          '1 instance',
        );

        // Step 3: Configure 500 field addition with "Add" action
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('500', '\\', '\\', 'a');
        BulkEditActions.selectActionForMarcInstance('Add');
        BulkEditActions.fillInDataTextAreaForMarcInstance(generalNoteText);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 4: Confirm changes and verify "Are you sure?" form for no MARC sources
        BulkEditActions.clickConfirmChangesButton();
        BulkEditActions.verifyAreYouSureFormWhenUsingMarcFieldsFlowForFolioInstance();

        // Step 5: Click "Keep editing" button
        BulkEditActions.clickKeepEditingBtn();

        // Step 6: Select "Remove all" action and confirm changes
        BulkEditActions.selectActionForMarcInstance('Remove all');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.clickConfirmChangesButton();
        BulkEditActions.verifyAreYouSureFormWhenUsingMarcFieldsFlowForFolioInstance();

        // Step 7: Close "Are you sure?" form and "Bulk edit MARC fields" form
        BulkEditActions.closeAreYouSureForm();
        BulkEditActions.closeBulkEditForm();
        BulkEditActions.verifyAreYouSureFormAbsents();
        BulkEditSearchPane.verifyMatchedResults(folioInstance.instanceHrid);

        // Step 8: Open FOLIO Instances bulk edit form
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditForm();
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 9: Select option and action to modify Instance records
        BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 10: Confirm changes and verify "Are you sure?" form
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          administrativeNoteText,
        );
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 11: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioInstance.instanceId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          administrativeNoteText,
        );

        // Step 12: Commit changes and verify success
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstance.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          administrativeNoteText,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 13: Download changed records in CSV format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioInstance.instanceId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          administrativeNoteText,
        );

        // Step 14: Navigate to Inventory and verify changes in instance record
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Verify administrative note was added
        InstanceRecordView.verifyAdministrativeNote(administrativeNoteText);
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
      },
    );
  });
});
