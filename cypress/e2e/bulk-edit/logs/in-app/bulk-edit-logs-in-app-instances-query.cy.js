import TopMenu from '../../../../support/fragments/topMenu';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
  dateTimeOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { BULK_EDIT_ACTIONS, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import DateTools from '../../../../support/utils/dateTools';

let user;
let fileNames;
const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const instances = {
  folio: {
    title: `AT_C446085_FolioInstance_${getRandomPostfix()}`,
  },
  marc: {
    title: `AT_C446085_MarcInstance_${getRandomPostfix()}`,
  },
};
const staffSuppressOption = 'Staff suppress';

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.enableStaffSuppressFacet.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // make sure there are no duplicate records in the system
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C446085');

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instances.folio.instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // Create FOLIO instance with Staff suppress
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instances.folio.instanceTypeId,
                  title: instances.folio.title,
                  staffSuppress: true,
                },
              }).then((createdInstanceData) => {
                instances.folio.id = createdInstanceData.instanceId;

                cy.getInstanceById(instances.folio.id).then((instanceData) => {
                  instances.folio.hrid = instanceData.hrid;
                });
              });
            })
            .then(() => {
              // Create MARC instance
              cy.createSimpleMarcBibViaAPI(instances.marc.title).then((instanceId) => {
                instances.marc.id = instanceId;

                cy.getInstanceById(instances.marc.id).then((instanceData) => {
                  instances.marc.hrid = instanceData.hrid;
                });
              });
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
        InventoryInstance.deleteInstanceViaApi(instances.folio.id);
        InventoryInstance.deleteInstanceViaApi(instances.marc.id);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C446085 Verify generated Logs files for Instances (Query) (firebird)',
        { tags: ['extendedPath', 'firebird', 'C446085'] },
        () => {
          const allInstances = [instances.folio, instances.marc];

          // Step 1: Select "Inventory - instances" radio button under "Record types" accordion
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 2-3: Select "Instance updated date" option by clicking on it
          QueryModal.typeInAndSelectField(instanceFieldValues.updatedDate);

          // Step 4: Click "Select operator" dropdown in "Operator" column
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(dateTimeOperators);

          // Step 5: Select "greater than or equal to" option in "Select operator" dropdown
          QueryModal.selectOperator(QUERY_OPERATIONS.GREATER_THAN_OR_EQUAL_TO);
          QueryModal.verifyQueryAreaContent('(instance.updated_at >= )');

          // Step 6: Click "Calendar" icon in the calendar component
          QueryModal.verifyDatePlaceholder();
          QueryModal.openCalendar();
          QueryModal.verifyCalendarOpenedDate(today);

          // Step 7: Select the date in the pop-up calendar to search instances
          QueryModal.selectDayFromCalendar(today);
          QueryModal.verifySelectedDateInCalendar(today);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.verifySelectedField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C446085_', 1);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Test query
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Step 10: Run query
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(interceptedUuid, true);

            // Step 11: Verify the "Set criteria" pane
            BulkEditSearchPane.isInstancesRadioChecked();
            BulkEditSearchPane.isBuildQueryButtonDisabled();

            // Step 12: Verify the "Bulk edit query" main pane
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyQueryHeadLine(
              `(instance.updated_at >= ${today}) AND (instance.title starts with AT_C446085_)`,
            );
            BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

            allInstances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instance.hrid,
              );
            });

            // Step 13: Download matched records
            BulkEditActions.downloadMatchedResults();

            allInstances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.matchedRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.id,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.id,
              );
            });

            // Step 14: Navigate to Logs tab and verify status
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.checkInstancesCheckbox();
            BulkEditLogs.verifyLogStatus(user.username, 'Data modification');
            BulkEditLogs.verifyEditingColumnValue(user.username, 'Query');

            // Step 15: Verify available files in logs
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenRunQuery();

            // Step 16: Go back to "Query" tab
            BulkEditSearchPane.openQuerySearch();
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditFolioInstanceForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);

            // Step 17: Select Staff suppress and Set false
            BulkEditActions.selectOption(staffSuppressOption);
            BulkEditSearchPane.verifyInputLabel(staffSuppressOption);
            BulkEditActions.selectAction(BULK_EDIT_ACTIONS.SET_TRUE);
            BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.SET_TRUE);
            BulkEditActions.verifyCheckboxAbsent();
            BulkEditActions.verifyConfirmButtonDisabled(false);

            // Step 18: Confirm changes
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

            allInstances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                'true',
              );
            });

            // Step 19: Download preview
            BulkEditActions.downloadPreview();

            allInstances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.previewRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.id,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                true,
              );
            });

            // Step 20: Commit changes
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(1);
            BulkEditSearchPane.verifyErrorByIdentifier(
              instances.folio.id,
              ERROR_MESSAGES.NO_CHANGE_REQUIRED,
              'Warning',
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              instances.marc.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              'true',
            );

            // Step 21: Download changed records
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instances.marc.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              true,
            );
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `WARNING,${instances.folio.id},${ERROR_MESSAGES.NO_CHANGE_REQUIRED}`,
            ]);

            // remove earlier downloaded files
            BulkEditFiles.deleteAllDownloadedFiles(fileNames);

            // Step 22: Navigate to Logs tab and verify final status
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogStatus(user.username, 'Completed with errors');
            BulkEditLogs.verifyEditingColumnValue(user.username, 'In app');

            // Step 23: Verify all files are available and download them
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();

            // Step 24: Download identifiers file
            BulkEditLogs.downloadQueryIdentifiers();
            ExportFile.verifyFileIncludes(fileNames.identifiersQueryFilename, [
              instances.folio.id,
              instances.marc.id,
            ]);
            BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.identifiersQueryFilename, 2);

            // Step 25-26: Download matching records file
            BulkEditLogs.downloadFileWithMatchingRecords();

            allInstances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.matchedRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.id,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.id,
              );
            });

            BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.matchedRecordsCSV, 2);

            // Step 27: Download preview file
            BulkEditLogs.downloadFileWithProposedChanges();

            allInstances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.previewRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
                instance.id,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                true,
              );
            });

            // Step 28: Download changed records file
            BulkEditLogs.downloadFileWithUpdatedRecords();
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instances.marc.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              true,
            );
            BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.changedRecordsCSV, 1);

            // Step 29: Download and verify errors file
            BulkEditLogs.downloadFileWithCommitErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `WARNING,${instances.folio.id},${ERROR_MESSAGES.NO_CHANGE_REQUIRED}`,
            ]);
          });
        },
      );
    });
  });
});
