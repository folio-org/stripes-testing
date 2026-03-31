import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  holdingsFieldValues,
  instanceFieldValues,
  booleanOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let fileNames;
let newLocationName;
let holdingsNoteTypeId;
let sourceId;
let firstHolding;
let secondHolding;
const customNoteTypeName = `AT_C499655_CustomNoteType_${getRandomPostfix()}`;
const noteText = 'Test note for deleted note type';
const instance = {
  title: `AT_C499655_FolioInstance_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instance.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            instance.holdingTypeId = holdingTypes[0].id;
          });
          InventoryInstances.getLocations({ limit: 2 }).then((locations) => {
            instance.locationId = locations[0].id;
            instance.secondLocationId = locations[1].id;
            newLocationName = locations[1].name;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });

          // Create custom holdings note type
          InventoryInstances.createHoldingsNoteTypeViaApi(customNoteTypeName).then((noteTypeId) => {
            holdingsNoteTypeId = noteTypeId;

            // Create instance with holding that has custom note and is suppressed
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: instance.holdingTypeId,
                  permanentLocationId: instance.locationId,
                  sourceId,
                  discoverySuppress: true,
                  notes: [
                    {
                      holdingsNoteTypeId,
                      note: noteText,
                      staffOnly: false,
                    },
                  ],
                },
                {
                  holdingsTypeId: instance.holdingTypeId,
                  permanentLocationId: instance.secondLocationId,
                  sourceId,
                  discoverySuppress: true,
                },
              ],
            }).then((instanceData) => {
              instance.id = instanceData.instanceId;

              cy.getHoldings({
                limit: 2,
                query: `"instanceId"="${instance.id}"`,
              })
                .then((holdings) => {
                  firstHolding = holdings.find((holding) => {
                    return (
                      holding.notes?.length > 0 &&
                      holding.notes[0].holdingsNoteTypeId === holdingsNoteTypeId
                    );
                  });
                  secondHolding = holdings.find((holding) => holding.notes.length === 0);
                })
                .then(() => {
                  // Delete the custom note type to create error conditions
                  InventoryInstances.deleteHoldingsNoteTypeViaApi(holdingsNoteTypeId);
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
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C499655 Verify generated Logs file with errors - query (firebird)',
        { tags: ['extendedPath', 'firebird', 'C499655'] },
        () => {
          // Step 1: Select "Inventory - holdings" radio button => Click "Build query" button
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 2-3: Click "Select field" dropdown => Type "suppress" in filter => Select "Holding - Suppressed from discovery"
          QueryModal.typeInAndSelectField(holdingsFieldValues.suppressFromDiscovery);

          // Step 4: Click "Select operator" dropdown
          QueryModal.verifyOperatorsList(booleanOperators);

          // Step 5: Select "equals" option
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyQueryAreaContent('(holdings.discovery_suppress == )');
          QueryModal.verifySelectedValue('Select value');

          // Step 6-7: Select "True" option
          QueryModal.chooseValueSelect('True');
          QueryModal.verifyOptionsInValueSelect(['True', 'False']);
          QueryModal.verifyQueryAreaContent('(holdings.discovery_suppress == true)');

          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceId, 1);
          QueryModal.verifySelectedField(instanceFieldValues.instanceId, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(instance.id, 1);

          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 8: Click "Test query" button
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickTestQuery();

          // Step 9: Verify "Preview of the matched records" elements
          QueryModal.verifyPreviewOfRecordsMatched();

          // Step 10: Click "Run query" button
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(interceptedUuid, true);

            // Step 11: Verify the "Set criteria" pane
            BulkEditSearchPane.isHoldingsRadioChecked(true);
            BulkEditSearchPane.isBuildQueryButtonDisabled(true);

            // Step 12: Verify the "Bulk edit query" main pane including Errors & warnings accordion
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(holdings.discovery_suppress == true) AND (instance.id == ${instance.id})`,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              firstHolding.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              firstHolding.hrid,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              secondHolding.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              secondHolding.hrid,
            );

            // TODO: Uncomment when the issue MODBULKOPS-640 is fixed

            // Verify Errors & warnings accordion with proper counts and pagination
            // BulkEditSearchPane.verifyErrorLabel(1, 0);
            // BulkEditSearchPane.verifyErrorByIdentifier(
            //   firstHolding.id,
            //   ERROR_MESSAGES.noteTypeNotFoundById(holdingsNoteTypeId),
            //   'Warning',
            // );
            // BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);
            // BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);

            // Step 13: Download matched records (CSV)
            BulkEditActions.downloadMatchedResults();

            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              firstHolding.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              firstHolding.id,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              secondHolding.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              secondHolding.id,
            );
            BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.matchedRecordsCSV, 2);

            // Step 14: Download errors (CSV)
            // TODO: Uncomment when the issue MODBULKOPS-640 is fixed

            // BulkEditActions.downloadErrors();
            // ExportFile.verifyFileIncludes(fileNames.matchingErrors, [
            //   `WARNING,${firstHolding.id},${ERROR_MESSAGES.noteTypeNotFoundById(holdingsNoteTypeId)}`,
            // ]);

            // Step 15: Navigate to Logs tab => Check holdings => Verify status "Data modification" and "Query"
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.checkHoldingsCheckbox();
            BulkEditLogs.verifyLogStatus(user.username, 'Data modification');
            BulkEditLogs.verifyEditingColumnValue(user.username, 'Query');

            // Step 16: Click "..." action => Verify available files including "File with errors encountered during the record matching"
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenRunQuery();

            // Step 17: Download "File with errors encountered during the record matching"
            // TODO: Uncomment when the issue MODBULKOPS-640 is fixed
            //  BulkEditLogs.downloadFileWithErrorsEncountered();
            //  ExportFile.verifyFileIncludes(fileNames.matchingErrors, [`WARNING,${firstHolding.id},${ERROR_MESSAGES.noteTypeNotFoundById(holdingsNoteTypeId)}`,]);

            // Remove earlier downloaded files
            BulkEditFiles.deleteAllDownloadedFiles(fileNames);

            // Step 18: Go back to "Query" tab => Start bulk edit
            BulkEditSearchPane.openQuerySearch();
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();

            // Step 19: Select "Permanent holdings location" option and replace with a location (e.g. "Online")
            BulkEditActions.replacePermanentLocation(newLocationName, 'holdings');

            // Step 20: Click "Confirm changes"
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              firstHolding.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              secondHolding.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );

            // Step 21: Download preview CSV
            BulkEditActions.downloadPreview();
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              firstHolding.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              secondHolding.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );

            // Step 22: Commit changes
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.verifySuccessBanner(1);
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              firstHolding.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            // Verify Errors & warnings accordion after committing changes - second holding gets "No changes required" error
            BulkEditSearchPane.verifyErrorLabel(0, 1);
            BulkEditSearchPane.verifyErrorByIdentifier(
              secondHolding.id,
              ERROR_MESSAGES.NO_CHANGE_REQUIRED,
              'Warning',
            );
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);

            // Step 23: Download changed records (CSV)
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              firstHolding.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );

            // Step 24: Download errors (CSV)
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `WARNING,${secondHolding.id},${ERROR_MESSAGES.NO_CHANGE_REQUIRED}`,
            ]);

            // Remove earlier downloaded files
            BulkEditFiles.deleteAllDownloadedFiles(fileNames);

            // Step 25: Navigate to Logs tab => Verify status "Completed with errors" and "In app"
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogStatus(user.username, 'Completed with errors');
            BulkEditLogs.verifyEditingColumnValue(user.username, 'In app');

            // Step 26: Click "..." action => Verify all 6 files available
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();

            // Step 27: Download "File with errors encountered during the record matching" from Logs
            // TODO: Uncomment when the issue MODBULKOPS-640 is fixed
            //  BulkEditLogs.downloadFileWithErrorsEncountered();
            //  ExportFile.verifyFileIncludes(fileNames.matchingErrors, [`WARNING,${firstHolding.id},${ERROR_MESSAGES.noteTypeNotFoundById(holdingsNoteTypeId)}`,]);
            BulkEditLogs.downloadFileWithCommitErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `WARNING,${secondHolding.id},${ERROR_MESSAGES.NO_CHANGE_REQUIRED}`,
            ]);
          });
        },
      );
    });
  });
});
