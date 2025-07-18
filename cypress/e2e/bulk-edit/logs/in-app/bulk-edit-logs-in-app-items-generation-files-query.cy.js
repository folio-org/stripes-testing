import TopMenu from '../../../../support/fragments/topMenu';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, ITEM_STATUS_NAMES } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import DateTools from '../../../../support/utils/dateTools';

let user;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewFileName;
let changedRecordsFileName;
let errorsFromCommittingFileName;
let bulkEditJobId;
const instance = {
  title: `AT_C436750_FolioInstance_${getRandomPostfix()}`,
  itemAvailable: {
    barcode: getRandomPostfix(),
  },
  itemCheckedOut: {
    barcode: getRandomPostfix(),
  },
};
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const reasonForError = 'New status value "Missing" is not allowed';

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data, run query, and perform bulk edit', () => {
        cy.createTempUser([
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instance.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            instance.holdingTypeId = holdingTypes[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locationData) => {
            instance.locationId = locationData.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypeData) => {
            instance.loanTypeId = loanTypeData[0].id;
          });
          cy.getMaterialTypes({ limit: 1 })
            .then((materialTypeData) => {
              instance.materialTypeId = materialTypeData.id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instance.instanceTypeId,
                  title: instance.title,
                },
                holdings: [
                  {
                    holdingsTypeId: instance.holdingTypeId,
                    permanentLocationId: instance.locationId,
                  },
                ],
                items: [
                  {
                    barcode: instance.itemAvailable.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: instance.loanTypeId },
                    materialType: { id: instance.materialTypeId },
                  },
                  {
                    barcode: instance.itemCheckedOut.barcode,
                    status: { name: ITEM_STATUS_NAMES.CHECKED_OUT },
                    permanentLoanType: { id: instance.loanTypeId },
                    materialType: { id: instance.materialTypeId },
                  },
                ],
              }).then((instanceData) => {
                instance.id = instanceData.instanceId;
                instance.itemAvailable.id = instanceData.items[0].id;
                instance.itemCheckedOut.id = instanceData.items[1].id;
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });

              // Step 1: Build and run Bulk edit query for "Inventory - items"
              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkItemsRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();
              QueryModal.selectField(itemFieldValues.instanceTitle);
              QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
              QueryModal.fillInValueTextfield(instance.title);
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
              QueryModal.clickTestQuery();
              QueryModal.verifyPreviewOfRecordsMatched();
              QueryModal.clickRunQuery();
              QueryModal.verifyClosed();
              cy.wait('@getPreview', getLongDelay()).then((interception) => {
                const interceptedUuid = interception.request.url.match(
                  /bulk-operations\/([a-f0-9-]+)\/preview/,
                )[1];
                bulkEditJobId = interceptedUuid;
                identifiersQueryFilename = `Query-${bulkEditJobId}.csv`;
                matchedRecordsQueryFileName = `${today}-Matched-Records-Query-${bulkEditJobId}.csv`;
                previewFileName = `${today}-Updates-Preview-CSV-Query-${bulkEditJobId}.csv`;
                changedRecordsFileName = `${today}-Changed-Records-CSV-Query-${bulkEditJobId}.csv`;
                errorsFromCommittingFileName = `${today}-Committing-changes-Errors-Query-${bulkEditJobId}.csv`;
              });

              // Step 2: Perform bulk edit so that part of Items records are edited and part are left unchanged
              BulkEditActions.openActions();
              BulkEditActions.openInAppStartBulkEditFrom();
              BulkEditActions.verifyBulkEditsAccordionExists();
              BulkEditActions.verifyOptionsDropdown();
              BulkEditActions.verifyRowIcons();
              BulkEditActions.verifyCancelButtonDisabled(false);
              BulkEditActions.verifyConfirmButtonDisabled(true);
              BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.MISSING);
              BulkEditSearchPane.verifyInputLabel(ITEM_STATUS_NAMES.MISSING);
              BulkEditActions.replaceWithIsDisabled();
              BulkEditActions.verifyConfirmButtonDisabled(false);
              BulkEditActions.confirmChanges();
              BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
              BulkEditActions.commitChanges();
              BulkEditActions.verifySuccessBanner(1);
              BulkEditSearchPane.verifyErrorLabel(1);
              BulkEditSearchPane.verifyErrorByIdentifier(
                instance.itemCheckedOut.id,
                reasonForError,
              );
            });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        FileManager.deleteFilesFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C436750 Verify generated Logs files for Items (Query - In app) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C436750'] },
        () => {
          const itemIds = [instance.itemAvailable.id, instance.itemCheckedOut.id];

          // Step 1: Check "Inventory - items" checkbox on "Record types" filter accordion
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkItemsCheckbox();

          // Step 2: Check values in Status and Editing columns
          BulkEditLogs.verifyLogStatus(user.username, 'Completed with errors');
          BulkEditLogs.verifyEditingColumnValue(user.username, 'In app');

          // Step 3: Click on the ... action element
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();

          // Step 4: Download identifiers file
          BulkEditLogs.downloadQueryIdentifiers();
          ExportFile.verifyFileIncludes(identifiersQueryFilename, [
            instance.itemAvailable.id,
            instance.itemCheckedOut.id,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(identifiersQueryFilename, 2);

          // Step 5: Download matching records file
          BulkEditLogs.downloadFileWithMatchingRecords();

          itemIds.forEach((itemId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              itemId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              itemId,
            );
          });

          BulkEditFiles.verifyCSVFileRowsRecordsNumber(matchedRecordsQueryFileName, 2);

          // Step 6: Download preview of proposed changes file
          BulkEditLogs.downloadFileWithProposedChanges();

          itemIds.forEach((itemId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              itemId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
              ITEM_STATUS_NAMES.MISSING,
            );
          });

          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            instance.itemCheckedOut.id,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
            ITEM_STATUS_NAMES.MISSING,
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(previewFileName, 2);

          // Step 7: Download updated records file
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            instance.itemAvailable.id,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
            ITEM_STATUS_NAMES.MISSING,
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(changedRecordsFileName, 1);

          // Step 8: Download errors encountered file
          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `ERROR,${instance.itemCheckedOut.id},${reasonForError}`,
          ]);
        },
      );
    });
  });
});
