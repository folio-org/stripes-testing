import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../../support/fragments/topMenu';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const suppressFromDiscovery = 'Suppress from discovery';
const actions = {
  setFalse: 'Set false',
};
const folioInstance = {
  title: `AT_C566120_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566120_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `marcItem${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];
const createdInstanceHrids = [];
const warningReason =
  'No change in value for instance required, suppressed associated records have been updated.';

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditInstances.gui,
            permissions.bulkEditLogsView.gui,
          ]);

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // create folio instance in College tenant
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                  discoverySuppress: false,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  folioInstance.hrid = instanceData.hrid;
                  createdInstanceHrids.push(instanceData.hrid);
                });
              });
            })
            .then(() => {
              // create marc instance in College tenant
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;

                cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                  marcInstance.hrid = instanceData.hrid;
                  createdInstanceHrids.push(instanceData.hrid);
                });
              });
            })
            .then(() => {
              // create holdings and items for both instances with suppressed from discovery
              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                  discoverySuppress: true,
                }).then((holding) => {
                  instance.holdingId = holding.id;

                  InventoryItems.createItemViaApi({
                    barcode: instance.itemBarcode,
                    holdingsRecordId: instance.holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    discoverySuppress: true,
                  });
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${folioInstance.uuid}\n${marcInstance.uuid}`,
              );
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.uuid);
        });

        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(instanceUUIDsFileName);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566120 Verify "Suppress from discovery" action (with warnings) for Instances in Member tenant (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C566120'] },
        () => {
          // Step 1: Select record type and identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload .csv file
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check upload result
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

          createdInstanceHrids.forEach((instanceHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instanceHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instanceHrid,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 4: Download matched records
          BulkEditActions.downloadMatchedResults();

          createdInstanceHrids.forEach((instanceHrid) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instanceHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Step 5: Open bulk edit form
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();

          // Step 6: Select "Suppress from discovery" option
          BulkEditActions.selectOption(suppressFromDiscovery);
          BulkEditActions.verifyOptionSelected(suppressFromDiscovery);

          // Step 7: Select "Set false" action
          BulkEditActions.selectAction(actions.setFalse);
          BulkEditActions.verifyActionSelected(actions.setFalse);
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);

          // Step 8: Check the checkboxes for holdings and items
          BulkEditActions.checkApplyToItemsRecordsCheckbox();
          BulkEditActions.clickApplyToHoldingsRecordsCheckbox();
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          createdInstanceHrids.forEach((instanceHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instanceHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
          });

          // Step 10: Download preview
          BulkEditActions.downloadPreview();

          createdInstanceHrids.forEach((instanceHrid) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instanceHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Step 11: Commit changes
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditActions.verifySuccessBanner('0');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
          BulkEditSearchPane.verifyErrorLabel(0, 2);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, true);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

          // Step 12: Check warnings table
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyErrorByIdentifier(instance.uuid, warningReason, 'Warning');
          });

          // Step 13: Download errors file
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `WARNING,${folioInstance.uuid},${warningReason}`,
            `WARNING,${marcInstance.uuid},${warningReason}`,
          ]);

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          // Step 14: Navigate to Logs tab
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();

          // Step 15: Filter by record type
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.verifyCheckboxIsSelected('INSTANCE', true);

          // Step 16: Click actions menu
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenNoChangesApplied();

          // Step 17: Download trigger file
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(instanceUUIDsFileName, [
            folioInstance.uuid,
            marcInstance.uuid,
          ]);

          // Step 18: Download matched records file
          BulkEditLogs.downloadFileWithMatchingRecords();

          createdInstanceHrids.forEach((instanceHrid) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instanceHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Step 19: Download preview file
          BulkEditLogs.downloadFileWithProposedChanges();

          createdInstanceHrids.forEach((instanceHrid) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instanceHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              false,
            );
          });

          // Step 20: Download errors file
          BulkEditLogs.downloadFileWithCommitErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `WARNING,${folioInstance.uuid},${warningReason}`,
            `WARNING,${marcInstance.uuid},${warningReason}`,
          ]);

          // Step 21: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

          instances.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventoryInstances.selectInstance();
            InventoryInstance.verifyInstanceTitle(instance.title);

            // Verify instance is not suppressed from discovery
            InstanceRecordView.verifyMarkAsStaffSuppressedWarning(false);

            // Verify holdings are not suppressed from discovery
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.checkHoldingRecordViewOpened();
            HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
            HoldingsRecordView.close();

            // Verify items are not suppressed from discovery
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.itemBarcode);
            ItemRecordView.waitLoading();
            ItemRecordView.suppressedAsDiscoveryIsAbsent();
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
