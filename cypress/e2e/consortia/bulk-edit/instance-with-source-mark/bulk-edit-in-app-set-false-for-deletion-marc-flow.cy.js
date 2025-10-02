import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../support/dictionary/affiliations';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const generalNote = 'DUPLICATE OF BIBLIOGRAPHIC RECORD SHOULD BE DELETED';
const marcInstance = {
  type: 'MARC',
  title: `AT_C831963_MarcInstance_${getRandomPostfix()}`,
  initialState: {
    discoverySuppress: true,
    staffSuppress: true,
    deleted: true,
  },
};

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiInventorySetRecordsForDeletion.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
            marcInstance.instanceId = instanceId;

            cy.getInstanceById(instanceId).then((instance) => {
              marcInstance.instanceHrid = instance.hrid;

              // Update MARC instance with initial state - set for deletion
              instance.discoverySuppress = marcInstance.initialState.discoverySuppress;
              instance.staffSuppress = marcInstance.initialState.staffSuppress;
              instance.deleted = marcInstance.initialState.deleted;

              cy.updateInstance(instance);

              // Create the CSV file with instance ID
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                marcInstance.instanceId,
              );

              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
                'Instance',
                'Instance UUIDs',
              );
              BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
              BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
              BulkEditSearchPane.waitFileUploading();
              BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
              BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
              BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
            });
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      // Trillium
      it.skip(
        'C831963 ECS | Verify Set false for deletion of Instances via MARC flow in Central tenant (Logs) (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C831963'] },
        () => {
          // Step 1: Uncheck columns under "Show columns" subsection
          BulkEditActions.openActions();
          BulkEditSearchPane.uncheckShowColumnCheckbox(
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
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
          );

          // Step 2: Select "Instances with source MARC" option
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '1 instance',
          );

          // Step 3: Under "Bulk edits for administrative data" accordion - Select "Staff suppress" with "Set false"
          BulkEditActions.selectOption('Staff suppress');
          BulkEditActions.selectAction('Set false');
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 4: Add "Suppress from discovery" option with "Set false" action
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.selectOption('Suppress from discovery', 1);
          BulkEditActions.selectAction('Set false', 1);
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 5: Add "Set records for deletion" option and verify available actions
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.selectOption('Set records for deletion', 2);
          BulkEditActions.verifyTheActionOptions(['Set false', 'Set true'], 2);

          // Step 6: Select "Set true" to test the dependency behavior
          BulkEditActions.selectAction('Set true', 2);
          BulkEditActions.verifyActionSelected('Set true');
          BulkEditActions.verifyActionSelected('Set true', 1);
          BulkEditActions.verifyActionsSelectDropdownDisabled(0);
          BulkEditActions.verifyActionsSelectDropdownDisabled(1);
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7: Change "Set records for deletion" back to "Set false"
          BulkEditActions.selectAction('Set false', 2);
          BulkEditActions.verifyActionsSelectDropdownDisabled(0, false);
          BulkEditActions.verifyActionsSelectDropdownDisabled(1, false);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Complete the administrative data selections with "Set false"
          BulkEditActions.selectAction('Set false', 0);
          BulkEditActions.selectAction('Set false', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Under "Bulk edits for instances with source MARC" - Add 500 field
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('500', '\\', '\\', 'a');
          BulkEditActions.selectActionForMarcInstance('Add');
          BulkEditActions.fillInDataTextAreaForMarcInstance(generalNote);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 10: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
          BulkEditActions.verifyKeepEditingButtonDisabled(false);
          BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
          BulkEditActions.isCommitButtonDisabled(false);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
              value: generalNote,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            marcInstance.instanceHrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 11: Download preview in CSV format and verify content
          BulkEditActions.downloadPreview();

          const editedHeaderValuesForFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: false,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: false,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
              value: false,
            },
          ];

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.instanceHrid,
            editedHeaderValuesForFile,
          );

          // Step 12: Download preview in MARC format and verify LDR05 and 500 field
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstance.instanceId,
              assertions: [
                (record) => expect(record.leader[5]).to.equal('c'),
                (record) => expect(record.get('500')[0].subf[0][0]).to.eq('a'),
                (record) => {
                  expect(record.get('500')[0].subf[0][1]).to.eq(generalNote);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 13: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            marcInstance.instanceHrid,
            editedHeaderValues,
          );

          // Step 14: Download changed records (CSV)
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.instanceHrid,
            editedHeaderValuesForFile,
          );

          // Step 15: Download changed records (MARC)
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 16: Navigate to "Logs" tab and verify bulk edit job results
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();

          // Step 17: Click on action menu for the recent bulk edit job
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted(true);

          // Step 18: Download "File that was used to trigger the bulk edit"
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(instanceUUIDsFileName, [marcInstance.instanceId]);

          // Step 19: Download "File with the matching records"
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.instanceHrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                value: marcInstance.initialState.discoverySuppress,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                value: marcInstance.initialState.staffSuppress,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
                value: marcInstance.initialState.deleted,
              },
            ],
          );

          // Step 20: Download "File with the preview of proposed changes (CSV)"
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.instanceHrid,
            editedHeaderValuesForFile,
          );

          // Step 21: Download "File with the preview of proposed changes (MARC)"
          BulkEditLogs.downloadFileWithProposedChangesMarc();

          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 22: Download "File with updated records (CSV)"
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.instanceHrid,
            editedHeaderValuesForFile,
          );

          // Step 23: Download "File with updated records (MARC)"
          BulkEditLogs.downloadFileWithUpdatedRecordsMarc();

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 24: Navigate to Inventory app and verify changes applied
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceIsSetForDeletion(false);
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(false);
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(false);
          InstanceRecordView.verifyGeneralNoteContent(generalNote);

          // Step 25: Verify source record MARC changes
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();

          // Verify LDR05 is set to 'c' and 500 field is added
          InventoryViewSource.checkFieldContentMatch('LDR', /^LEADER \d{5}c/);
          InventoryViewSource.verifyFieldInMARCBibSource('500', `$a ${generalNote}`);
          InventoryViewSource.close();
        },
      );
    });
  });
});
