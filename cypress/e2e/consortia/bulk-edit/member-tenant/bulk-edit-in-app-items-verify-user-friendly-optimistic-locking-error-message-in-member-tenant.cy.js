import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import MaterialTypes from '../../../../support/fragments/settings/inventory/materialTypes';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import DateTools from '../../../../support/utils/dateTools';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let sourceId;
let materialTypeId;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let errorsFromCommittingFileName;
const itemIds = [];
const instanceIds = [];
const holdingIds = [];
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
  permissions.bulkEditQueryView.gui,
];
const materialTypeName = `AT_C590844_MaterialType_${getRandomPostfix()}`;
const actionNote = 'Action note added in Inventory';
const administrativeNote = 'Administrative note added during Bulk Edit';
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const errorMessage = ERROR_MESSAGES.OPTIMISTIC_LOCKING;

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

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          MaterialTypes.createMaterialTypeViaApi({
            name: materialTypeName,
          }).then(({ body }) => {
            materialTypeId = body.id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              for (let i = 0; i < 2; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `AT_C590844_FolioInstance_${getRandomPostfix()}`,
                  },
                }).then((createdInstanceData) => {
                  instanceIds.push(createdInstanceData.instanceId);
                });
              }
            })
            .then(() => {
              instanceIds.forEach((instanceId) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  holdingIds.push(holding.id);
                });
              });
            })
            .then(() => {
              holdingIds.forEach((holdingId) => {
                InventoryItems.createItemViaApi({
                  barcode: `Item_${getRandomPostfix()}`,
                  holdingsRecordId: holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  itemIds.push(item.id);
                });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkItemsRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();
              QueryModal.selectField(itemFieldValues.materialTypeName);
              QueryModal.verifySelectedField(itemFieldValues.materialTypeName);
              QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
              QueryModal.chooseValueSelect(materialTypeName);
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
              QueryModal.clickTestQuery();
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College);

        instanceIds.forEach((instanceId) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        });

        MaterialTypes.deleteViaApi(materialTypeId);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
          errorsFromCommittingFileName,
          identifiersQueryFilename,
        );
      });

      it(
        'C590844 Verify user-friendly optimistic locking error message for Item in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C590844'] },
        () => {
          // Step 1: Run the Query and capture file names
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `${today}-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `${today}-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `${today}-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
            errorsFromCommittingFileName = `${today}-Committing-changes-Errors-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 item');

            // Step 2: Download matched records
            BulkEditActions.downloadMatchedResults();

            itemIds.forEach((itemId) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                itemId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                itemId,
              );
            });

            // Step 3: Check checkbox for Item UUID if not checked
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            );

            itemIds.forEach((itemId) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                itemId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                itemId,
              );
            });

            // Step 4-6: Navigate to Inventory and edit the first item
            const itemToEditInInventoryId = itemIds[0];

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.waitLoading();
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.searchByParameter('Item UUID', itemToEditInInventoryId);
            ItemRecordView.waitLoading();
            ItemRecordView.openItemEditForm('AT_C590844_FolioInstance');
            ItemRecordEdit.waitLoading('AT_C590844_FolioInstance');
            ItemRecordEdit.addItemsNotes(actionNote);
            ItemRecordEdit.saveAndClose();
            ItemRecordView.waitLoading();

            // Step 7: Return to Bulk edit
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 item');

            // Step 8: Open In-app bulk edit form
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);

            // Step 9: Select option and action to modify items
            BulkEditActions.addItemNote('Administrative note', administrativeNote);
            BulkEditActions.verifyConfirmButtonDisabled(false);

            // Step 10: Confirm changes
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
            BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

            itemIds.forEach((itemId) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                itemId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
                administrativeNote,
              );
            });

            // Step 11: Download preview
            BulkEditActions.downloadPreview();

            itemIds.forEach((itemId) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                itemId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
                administrativeNote,
              );
            });

            // Step 12: Commit changes and verify optimistic locking error
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(1);

            const itemEditedDuringBulkEditId = itemIds[1];

            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              itemEditedDuringBulkEditId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
            BulkEditSearchPane.verifyErrorLabel(1);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

            // Step 13: Verify error details and click View latest version
            // need current url to go back to Bulk Edit page after Item verification in Inventory app
            cy.url().then((bulkEditUrl) => {
              BulkEditSearchPane.verifyNonMatchedResults(itemToEditInInventoryId, errorMessage);

              // Step 14: Click on View latest version active text
              BulkEditSearchPane.clickViewLatestVersionInErrorsAccordionByIdentifier(
                itemToEditInInventoryId,
              );
              ItemRecordView.waitLoading();
              ItemRecordView.checkMultipleItemNotesWithStaffOnly(
                0,
                'No',
                'Action note',
                actionNote,
              );
              ItemRecordView.checkItemAdministrativeNote('-');

              // Step 15: Download changed records
              // workaround to go back to Bulk Edit page
              cy.visit(bulkEditUrl);
              BulkEditSearchPane.verifyErrorLabel(1);
              BulkEditActions.openActions();
              BulkEditActions.downloadChangedCSV();
              BulkEditFiles.verifyValueInRowByUUID(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                itemEditedDuringBulkEditId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
                administrativeNote,
              );

              // Step 16-17: Download errors CSV
              BulkEditActions.downloadErrors();
              ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
                `ERROR,${itemToEditInInventoryId},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${instanceIds[0]}/${holdingIds[0]}/${itemToEditInInventoryId}`,
              ]);

              // Step 18: Verify changes were applied to the item not affected by optimistic locking
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.waitLoading();
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.searchByParameter('Item UUID', itemEditedDuringBulkEditId);
              ItemRecordView.waitLoading();
              ItemRecordView.checkItemAdministrativeNote(administrativeNote);
            });
          });
        },
      );
    });
  });
});
