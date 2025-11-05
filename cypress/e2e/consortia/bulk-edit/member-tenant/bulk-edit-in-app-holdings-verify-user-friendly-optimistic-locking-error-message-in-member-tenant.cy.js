import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
let locationId;
let sourceId;
const holdingIds = [];
const instanceIds = [];
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const actionNote = 'Action note added in Inventory';
const administrativeNote = 'Administrative note added during Bulk Edit';
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
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
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // create instances in central tenant
              for (let i = 0; i < 2; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `AT_C590843_FolioInstance_${getRandomPostfix()}`,
                  },
                }).then((createdInstanceData) => {
                  instanceIds.push(createdInstanceData.instanceId);
                });
              }
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              // create holdings in College tenant
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
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${holdingIds.join('\n')}`,
              );

              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
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

        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C590843 Verify user-friendly optimistic locking error message for Holdings in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C590843'] },
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
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          );

          holdingIds.forEach((holdingId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
            );
          });

          // Step 4: Download matched records
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

          // Step 5: Check checkbox for Holdings UUID if not checked
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          );

          holdingIds.forEach((holdingId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
            );
          });

          // Step 6-8: Navigate to Inventory and edit the first holding
          const holdingToEditInInventoryId = holdingIds[0];

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.searchByParameter('Holdings UUID', holdingToEditInInventoryId);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.checkHoldingRecordViewOpened();

          // Edit the holding to create version conflict
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.addHoldingsNotes(actionNote);
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.checkHoldingRecordViewOpened();

          // Step 9: Return to Bulk edit
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.verifyPaneRecordsCount('2 holdings');

          // Step 10: Open In-app bulk edit form
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 11: Select option and action to modify holdings
          BulkEditActions.addItemNote('Administrative note', administrativeNote);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 12: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          holdingIds.forEach((holdingId) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
          });

          // Step 13: Download preview
          BulkEditActions.downloadPreview();

          holdingIds.forEach((holdingId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );
          });

          // Step 14: Commit changes and verify optimistic locking error
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);

          const holdingEditedDuringBulkEditId = holdingIds[1];

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            holdingEditedDuringBulkEditId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            administrativeNote,
          );
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          // Step 15: Verify error details
          // need current url to go back to Bulk Edit page after Holdings verification in Inventory app
          cy.url().then((bulkEditUrl) => {
            BulkEditSearchPane.verifyNonMatchedResults(holdingToEditInInventoryId, errorMessage);

            // Step 16: Click on View latest version active text
            BulkEditSearchPane.clickViewLatestVersionInErrorsAccordionByIdentifier(
              holdingToEditInInventoryId,
            );
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkHoldingRecordViewOpened();
            HoldingsRecordView.checkNotesByType(0, 'Action note', actionNote, 'No');
            HoldingsRecordView.checkAdministrativeNote('-');

            // Step 17: Download changed records
            // workaround to go back to Bulk Edit page
            cy.visit(bulkEditUrl);
            BulkEditSearchPane.verifyErrorLabel(1);
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingEditedDuringBulkEditId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              administrativeNote,
            );

            // Step 18-19: Download errors CSV
            BulkEditActions.downloadErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `ERROR,${holdingToEditInInventoryId},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${instanceIds[0]}/${holdingToEditInInventoryId}`,
            ]);

            // Step 20: Verify changes were applied to the holding not affected by optimistic locking
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.waitLoading();
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchByParameter(
              'Holdings UUID',
              holdingEditedDuringBulkEditId,
            );
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.checkHoldingRecordViewOpened();
            HoldingsRecordView.checkAdministrativeNote(administrativeNote);
          });
        },
      );
    });
  });
});
