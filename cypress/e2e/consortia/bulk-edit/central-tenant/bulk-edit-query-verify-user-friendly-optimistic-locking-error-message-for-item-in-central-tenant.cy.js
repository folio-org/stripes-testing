import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import FileManager from '../../../../support/utils/fileManager';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let materialTypeId;
let loanTypeId;
const items = [];
const itemHrids = [];

const folioInstance = {
  title: `AT_C594346_FolioInstance_${getRandomPostfix()}`,
  holdingId: null,
  uuid: null,
};

let fileNames;

const adminNote = 'Admin note added in Inventory';
const noteAddedDuringBulkEdit = 'Admin note added during Bulk Edit';
// Error message without "View latest version" link – per test step 13 the link is NOT present in ECS central tenant for items
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
          permissions.uiInventoryViewCreateEditItems.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Assign affiliation to College member tenant
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
            permissions.bulkEditQueryView.gui,
          ]);

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            loanTypeId = loanTypes[0].id;
          });
          cy.getDefaultMaterialType().then((materialTypes) => {
            materialTypeId = materialTypes.id;
          });

          cy.resetTenant()
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
            })
            .then(() => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: folioInstance.uuid,
                permanentLocationId: locationId,
                sourceId,
              }).then((holding) => {
                folioInstance.holdingId = holding.id;

                // Create two items in College member tenant
                for (let i = 0; i < 2; i++) {
                  InventoryItems.createItemViaApi({
                    barcode: `BC${getRandomPostfix()}-${i}`,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                    holdingsRecordId: holding.id,
                  }).then((item) => {
                    items.push(item.id);
                    itemHrids.push(item.hrid);
                  });
                  cy.wait(500);
                }
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

              // Step 1: The Bulk edit query is built to query any Item records from member tenant for Bulk Edit
              cy.intercept('GET', '**/query/**').as('query');
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('preview');

              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkItemsRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();

              // We query specifically by the Item UUIDs we just created
              QueryModal.selectField(itemFieldValues.itemUuid);
              QueryModal.selectOperator(QUERY_OPERATIONS.IN);
              QueryModal.fillInValueTextfield(`${items[0]},${items[1]}`);

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
                BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 item');
                BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
              });
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        items.forEach((itemId) => {
          InventoryItems.deleteItemViaApi(itemId);
        });
        if (folioInstance.holdingId) {
          cy.deleteHoldingRecordViaApi(folioInstance.holdingId);
        }

        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);

        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C594346 Verify user-friendly optimistic locking error message for Item in Central tenant (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C594346'] },
        () => {
          // Step 2: Download matched records (CSV)
          BulkEditActions.downloadMatchedResults();

          items.forEach((id) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              id,
            );
          });

          // Step 3-4: Verify Item UUID column and UUIDs in Results table
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          );

          items.forEach((id) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              id,
            );
          });

          // Step 5-7: Edit the item via API to create an optimistic locking version conflict
          // (Simulating another user editing the record in a different browser/session)
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryItems.getItemViaApi({ query: `"id"=="${items[0]}"` }).then((itemsRes) => {
            const itemToUpdate = itemsRes[0];
            itemToUpdate.administrativeNotes = [adminNote];
            cy.updateItemViaApi(itemToUpdate);
          });
          cy.resetTenant();
          cy.getUserToken(user.username, user.password);

          // Step 8: Open In-app bulk edit form
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 9: Select option and action to modify Item records
          BulkEditActions.addItemNote('Administrative note', noteAddedDuringBulkEdit);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 10: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          items.forEach((id) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              noteAddedDuringBulkEdit,
            );
          });

          // Step 11: Download preview in CSV format
          BulkEditActions.downloadPreview();

          items.forEach((id) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              noteAddedDuringBulkEdit,
            );
          });

          // Step 12: Commit changes and verify partial success with optimistic locking error
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);

          // The second item (not edited outside bulk edit) should have the change applied
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            items[1],
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            noteAddedDuringBulkEdit,
          );

          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          // Step 13: Verify error details for the first item (no link to latest version in ECS)
          BulkEditSearchPane.verifyNonMatchedResults(items[0], optimisticLockingErrorMessage);

          // Step 14: Download changed records (CSV)
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            items[1],
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            noteAddedDuringBulkEdit,
          );

          // Step 15-16: Download errors CSV and verify optimistic locking message with partial URL
          BulkEditActions.downloadErrors();
          FileManager.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `ERROR,${items[0]},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${folioInstance.uuid}/${folioInstance.holdingId}/${items[0]}`,
          ]);

          // Step 17: Switch to member tenant and verify changes were applied to the second item
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Item HRID', itemHrids[1]);
          ItemRecordView.waitLoading();

          // The second item was successfully changed - verify admin note added by bulk edit
          ItemRecordView.checkItemAdministrativeNote(noteAddedDuringBulkEdit);
          ItemRecordView.closeDetailView();

          // Step 18: Search for errored first item and verify bulk edit changes were NOT applied
          InventorySearchAndFilter.searchByParameter('Item HRID', itemHrids[0]);
          ItemRecordView.waitLoading();

          // The first item still has the manually-added note but NOT the bulk edit note
          ItemRecordView.checkItemAdministrativeNote(adminNote);
          ItemRecordView.verifyTextAbsent(noteAddedDuringBulkEdit);
        },
      );
    });
  });
});
