import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_ACTIONS, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let instanceId;
const holdingIds = [];
const holdingUUIDsFileName = `AT_C468224_holdingUUIDs_${getRandomPostfix()}.csv`;
const administrativeNote = 'administrative note';
const bindingNote = 'binding note';
const errorMessage = ERROR_MESSAGES.OPTIMISTIC_LOCKING;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditHoldings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          locationId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource()
          .then((folioSource) => {
            sourceId = folioSource.id;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: `AT_C468224_FolioInstance_${getRandomPostfix()}`,
              },
            }).then((createdInstanceData) => {
              instanceId = createdInstanceData.instanceId;
            });
          })
          .then(() => {
            for (let i = 0; i < 5; i++) {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId,
                permanentLocationId: locationId,
                sourceId,
              }).then((holding) => {
                holdingIds.push(holding.id);
              });
            }
          })
          .then(() => {
            FileManager.createFile(
              `cypress/fixtures/${holdingUUIDsFileName}`,
              holdingIds.join('\n'),
            );

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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C468224 Verify user-friendly error message for optimistic locking - holdings (firebird)',
      { tags: ['extendedPath', 'firebird', 'C468224'] },
      () => {
        // Step 1: Select "Inventory - holdings" radio button and "Holdings UUIDs" identifier
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

        // Step 2: Upload .csv file with Holdings UUIDs
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Verify upload results
        BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('5 holdings');
        BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

        // Step 4: Show Source and Holdings UUID columns
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SOURCE,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
        );

        // Step 5: Note the UUID of the FOLIO holding to be edited in Inventory
        const holdingToEditInInventoryId = holdingIds[0];

        // Steps 6-7: Update holding via admin API to cause version conflict
        cy.getAdminToken();
        cy.getHoldings({ limit: 1, query: `"id"="${holdingToEditInInventoryId}"` }).then(
          (holdingsResponse) => {
            const holdingToUpdate = holdingsResponse[0];
            holdingToUpdate.administrativeNotes = [administrativeNote];
            cy.updateHoldingRecord(holdingToUpdate.id, holdingToUpdate);
          },
        );
        cy.getUserToken(user.username, user.password);

        // Step 8: Verify still on Bulk edit page with 5 holdings
        BulkEditSearchPane.verifyPaneRecordsCount('5 holdings');

        // Step 9: Download matched records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        holdingIds.forEach((holdingId) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            holdingId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            holdingId,
          );
        });

        // Step 10: Open In-app bulk edit form
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyCancelButtonDisabled(false);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Steps 11-14: Select "Binding" option, "Add note" action, fill in binding note text
        BulkEditActions.addItemNote('Binding', bindingNote);
        BulkEditActions.verifyTheActionOptions([
          BULK_EDIT_ACTIONS.ADD_NOTE,
          BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
          BULK_EDIT_ACTIONS.REMOVE_ALL,
          BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
        ]);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 15: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(holdingIds.length);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(holdingIds.length);
        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);

        holdingIds.forEach((holdingId) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            holdingId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
            bindingNote,
          );
        });

        // Step 16: Download preview in CSV format
        BulkEditActions.downloadPreview();

        holdingIds.forEach((holdingId) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            holdingId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
            bindingNote,
          );
        });

        // Step 17: Commit changes - verify 4 records updated, 1 error
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(4);
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

        const successfullyEditedHoldingIds = holdingIds.slice(1);

        successfullyEditedHoldingIds.forEach((holdingId) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            holdingId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
            bindingNote,
          );
        });

        // Step 18: Check that the edited holding appears in errors table with optimistic locking message
        cy.url().then((bulkEditUrl) => {
          BulkEditSearchPane.verifyNonMatchedResults(holdingToEditInInventoryId, errorMessage);

          // Step 19: Click "View latest version" link - verify latest version is opened in Inventory
          BulkEditSearchPane.clickViewLatestVersionInErrorsAccordionByIdentifier(
            holdingToEditInInventoryId,
          );
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          HoldingsRecordView.checkAdministrativeNote(administrativeNote);

          // Step 20: Go back to bulk edit, download changed records (CSV)
          cy.visit(bulkEditUrl);
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          successfullyEditedHoldingIds.forEach((holdingId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
              bindingNote,
            );
          });

          // Step 21: Download errors (CSV)
          BulkEditActions.downloadErrors();

          // Step 22: Verify error CSV contains the optimistic locking error with partial URL
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `ERROR,${holdingToEditInInventoryId},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${instanceId}/${holdingToEditInInventoryId}`,
          ]);

          // Step 23: Verify binding note was applied to successfully updated holdings
          successfullyEditedHoldingIds.forEach((holdingId) => {
            cy.visit(`/inventory/view/${instanceId}/${holdingId}`);
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkNotesByType(0, 'Binding', bindingNote, 'No');
          });
        });
      },
    );
  });
});
