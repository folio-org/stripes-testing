import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';

let user;
let instanceTypeId;
let holdingSource;
let collegeLocationId;

const folioInstance = {
  title: `AT_C594345_FolioInstance_${getRandomPostfix()}`,
};

const holdings = [];
const holdingHrids = [];

const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName, true);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  holdingUUIDsFileName,
  true,
);

const adminNote = 'Admin note added in Inventory';
const noteAddedDuringBulkEdit = 'Admin note added during Bulk Edit';

// Error message without "View latest version" link – per test step 15 the link is NOT present in ECS central tenant for holdings
const optimisticLockingErrorMessage =
  'The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1.';

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.resetTenant();
        cy.getAdminToken();

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Assign affiliation to College member tenant
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
          ]);

          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // Create shared FOLIO instance in central tenant
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.id = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              // Create two holdings in College member tenant
              cy.setTenant(Affiliations.College);

              cy.getLocations({ limit: 1 }).then((res) => {
                collegeLocationId = res.id;
              });

              InventoryHoldings.getHoldingsFolioSource()
                .then((folioSource) => {
                  holdingSource = folioSource.id;
                })
                .then(() => {
                  for (let i = 0; i < 2; i++) {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: folioInstance.id,
                      permanentLocationId: collegeLocationId,
                      sourceId: holdingSource,
                    }).then((holding) => {
                      holdings.push(holding.id);
                      holdingHrids.push(holding.hrid);
                    });
                    cy.wait(500);
                  }
                })
                .then(() => {
                  FileManager.createFile(
                    `cypress/fixtures/${holdingUUIDsFileName}`,
                    `${holdings[0]}\n${holdings[1]}`,
                  );

                  cy.resetTenant();
                  cy.login(user.username, user.password, {
                    path: TopMenu.bulkEditPath,
                    waiter: BulkEditSearchPane.waitLoading,
                  });
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                });
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        holdings.forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });

        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(folioInstance.id);

        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C594345 Verify user-friendly optimistic locking error message for Holdings in Central tenant (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C594345'] },
        () => {
          // Step 1: Select "Inventory - holdings" radio button and Holdings UUIDs
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

          // Step 2: Upload CSV file with Holdings UUIDs
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.checkForUploading(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Verify upload results
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          // Step 4: Download matched records (CSV)
          BulkEditActions.downloadMatchedResults();

          holdings.forEach((holdingId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
            );
          });

          // Steps 5-6: Show Holdings UUID column and verify UUIDs
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          );

          holdings.forEach((holdingId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
            );
          });

          // Step 7-9: Edit the holding via API to create an optimistic locking version conflict
          // (Simulating another user editing the record in a different browser/session)
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.getHoldings({ limit: 1, query: `"id"="${holdings[0]}"` }).then((holdingsResponse) => {
            const holdingToUpdate = holdingsResponse[0];
            holdingToUpdate.administrativeNotes = [adminNote];
            cy.updateHoldingRecord(holdingToUpdate.id, holdingToUpdate);
          });

          cy.resetTenant();

          // Step 10: Open In-app bulk edit form
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 11: Select option and action to modify Holdings records
          BulkEditActions.addItemNote('Administrative note', noteAddedDuringBulkEdit);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 12: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          holdings.forEach((holdingId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              noteAddedDuringBulkEdit,
            );
          });

          // Step 13: Download preview in CSV format
          BulkEditActions.downloadPreview();

          holdings.forEach((holdingId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              noteAddedDuringBulkEdit,
            );
          });

          // Step 14: Commit changes and verify partial success with optimistic locking error
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);

          // The second holding (not edited outside bulk edit) should have the change applied
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            holdings[1],
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            noteAddedDuringBulkEdit,
          );

          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          // Step 15: Verify error details for the first holding (no link to latest version in ECS)
          cy.url().then((bulkEditUrl) => {
            BulkEditSearchPane.verifyNonMatchedResults(holdings[0], optimisticLockingErrorMessage);

            // Step 16: Download changed records (CSV)
            cy.visit(bulkEditUrl);
            BulkEditSearchPane.verifyErrorLabel(1);
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdings[1],
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              noteAddedDuringBulkEdit,
            );

            // Step 17-18: Download errors CSV and verify optimistic locking message with partial URL
            BulkEditActions.downloadErrors();
            FileManager.verifyFileIncludes(errorsFromCommittingFileName, [
              `ERROR,${holdings[0]},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${folioInstance.id}/${holdings[0]}`,
            ]);

            // Step 19: Switch to member tenant and verify changes were applied to the second holding
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.waitLoading();
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(holdingHrids[1]);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();

            // The second holding was successfully changed - verify admin note added by bulk edit
            HoldingsRecordView.checkAdministrativeNote(noteAddedDuringBulkEdit);
            HoldingsRecordView.close();

            // Step 20: Search for errored first holding and verify bulk edit changes were NOT applied
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(holdingHrids[0]);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();

            // The first holding still has the manually-added note but NOT the bulk edit note
            HoldingsRecordView.checkAdministrativeNote(adminNote);
            HoldingsRecordView.checkHoldingNoteTypeAbsent(
              'Administrative note',
              noteAddedDuringBulkEdit,
            );
          });
        },
      );
    });
  });
});
