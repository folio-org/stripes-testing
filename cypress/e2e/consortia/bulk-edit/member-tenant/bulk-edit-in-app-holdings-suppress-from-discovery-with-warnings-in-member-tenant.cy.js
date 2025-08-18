import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

let user;
let instanceTypeId;
let collegeLocation;
let collegeMaterialTypeId;
let collegeLoanTypeId;
let holdingSource;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
const suppressFromDiscovery = 'Suppress from discovery';
const actions = {
  setFalse: 'Set false',
  setTrue: 'Set true',
};
const folioInstance = {
  title: `AT_C566164_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566164_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];
const warningReason =
  'No change in value for holdings record required, associated suppressed item(s) have been updated.';

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.withinTenant(Affiliations.College, () => {
          cy.createTempUser([
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
            permissions.bulkEditLogsView.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              instanceTypeId = instanceTypeData[0].id;
            });
            cy.getLocations({ limit: 1 }).then((res) => {
              collegeLocation = res;
            });
            InventoryHoldings.getHoldingsFolioSource()
              .then((folioSource) => {
                holdingSource = folioSource.id;
              })
              .then(() => {
                // create folio instance
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
                // create marc instance
                cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                  marcInstance.id = instanceId;
                });
              })
              .then(() => {
                // create holdings for both instances
                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: collegeLocation.id,
                    sourceId: holdingSource,
                    discoverySuppress: false,
                  }).then((holding) => {
                    instance.holdingId = holding.id;
                    cy.getHoldings({
                      limit: 1,
                      query: `"instanceId"="${instance.id}"`,
                    }).then((holdings) => {
                      instance.holdingHrid = holdings[0].hrid;
                    });
                  });
                  cy.wait(1000);
                });
              })
              .then(() => {
                // create items for both holdings, suppressed from discovery
                cy.getMaterialTypes({ limit: 1 }).then((res) => {
                  collegeMaterialTypeId = res.id;
                });
                cy.getLoanTypes({ limit: 1 }).then((res) => {
                  collegeLoanTypeId = res[0].id;
                });
              })
              .then(() => {
                instances.forEach((instance) => {
                  InventoryItems.createItemViaApi({
                    barcode: instance.itemBarcode,
                    holdingsRecordId: instance.holdingId,
                    materialType: { id: collegeMaterialTypeId },
                    permanentLoanType: { id: collegeLoanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    discoverySuppress: true,
                  }).then((item) => {
                    instance.itemId = item.id;
                  });
                  cy.wait(1000);
                });
              })
              .then(() => {
                FileManager.createFile(
                  `cypress/fixtures/${holdingUUIDsFileName}`,
                  `${folioInstance.holdingId}\n${marcInstance.holdingId}`,
                );
              });
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        });

        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(holdingUUIDsFileName);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566164 Verify "Suppress from discovery" action (with warnings) for Holdings in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566164'] },
        () => {
          // Step 1: Select record type and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

          // Step 2: Upload .csv file
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);

          // Step 3: Check upload result
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHrid,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 4: Download matched records
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.INSTANCE,
              instance.title,
            );
          });

          // Step 5: Start bulk edit
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 6: Select 'Suppress from discovery'
          BulkEditActions.selectOption(suppressFromDiscovery);
          BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);

          // Step 7: Select 'Set false' option
          BulkEditActions.selectAction(actions.setFalse);
          BulkEditActions.verifyActionSelected(actions.setFalse);
          BulkEditActions.applyToItemsRecordsCheckboxExists(false);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Check 'Apply to all items records' checkbox
          BulkEditActions.checkApplyToItemsRecordsCheckbox();
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);

          // Step 10: Download preview
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Step 11: Commit changes and verify errors/warnings
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(0);
          BulkEditSearchPane.verifyNoChangesPreview();
          BulkEditSearchPane.verifyErrorLabel(0, 2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              instance.holdingId,
              warningReason,
              'Warning',
            );
          });

          BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

          // Step 13: Download errors (warnings) file
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `WARNING,${folioInstance.holdingId},${warningReason}`,
            `WARNING,${marcInstance.holdingId},${warningReason}`,
          ]);

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          // Step 14: Go to Logs tab
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.verifyCheckboxIsSelected('HOLDINGS_RECORD', true);
          BulkEditLogs.clickActionsRunBy(user.username);

          // Step 16: Click "..." and verify available files
          BulkEditLogs.verifyLogsRowActionWhenNoChangesApplied();

          // Step 17: Download identifiers file
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(holdingUUIDsFileName, [
            folioInstance.holdingId,
            marcInstance.holdingId,
          ]);

          // Step 18: Download matched records file
          BulkEditLogs.downloadFileWithMatchingRecords();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Step 19: Download preview file
          BulkEditLogs.downloadFileWithProposedChanges();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Step 20: Download errors file
          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `WARNING,${folioInstance.holdingId},${warningReason}`,
            `WARNING,${marcInstance.holdingId},${warningReason}`,
          ]);

          // Step 21: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          cy.wait(2000);
          InventorySearchAndFilter.switchToHoldings();

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
            HoldingsRecordView.close();
            InventoryInstance.openHoldingsAccordion(collegeLocation.name);
            InventoryInstance.openItemByBarcode(instance.itemBarcode);
            cy.wait(2000);
            ItemRecordView.suppressedAsDiscoveryIsAbsent();
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
