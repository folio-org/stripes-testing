import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceHRIDFileName;
let item;
let matchedRecordsFileName;
let previewOfProposedChangesFileName;
let updatedRecordsFileName;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Logs', () => {
      describe('In-app approach', () => {
        beforeEach('create test data', () => {
          instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
          item = {
            instanceName: `testBulkEdit_${getRandomPostfix()}`,
            itemBarcode: getRandomPostfix(),
          };
          matchedRecordsFileName = `*-Matched-Records-${instanceHRIDFileName}`;
          previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${instanceHRIDFileName}`;
          updatedRecordsFileName = `*-Changed-Records*-${instanceHRIDFileName}`;

          cy.createTempUser([
            permissions.inventoryAll.gui,
            permissions.bulkEditView.gui,
            permissions.bulkEditEdit.gui,
            permissions.bulkEditLogsView.gui,
          ]).then((userProperties) => {
            user = userProperties;

            item.instanceId = InventoryInstances.createInstanceViaApi(
              item.instanceName,
              item.itemBarcode,
            );
            cy.getHoldings({
              limit: 1,
              expandAll: true,
              query: `"instanceId"="${item.instanceId}"`,
            }).then((holdings) => {
              item.holdingsHRID = holdings[0].hrid;
              cy.updateHoldingRecord(holdings[0].id, {
                ...holdings[0],
                discoverySuppress: true,
              });
            });
            cy.getInstanceById(item.instanceId).then((body) => {
              body.discoverySuppress = true;
              cy.updateInstance(body);
              item.instanceHRID = body.hrid;
              FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, item.instanceHRID);
            });
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        });

        afterEach('delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
          FileManager.deleteFile(`cypress/fixtures/${instanceHRIDFileName}`);
          FileManager.deleteFileFromDownloadsByMask(
            instanceHRIDFileName,
            `*${matchedRecordsFileName}`,
            previewOfProposedChangesFileName,
            updatedRecordsFileName,
          );
        });

        it(
          'C402326 Verify "Suppress from discovery" option is set to False when Holdings are suppressed and Items are not (firebird)',
          { tags: ['criticalPath', 'firebird', 'C402326'] },
          () => {
            BulkEditSearchPane.checkHoldingsRadio();
            BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
            BulkEditSearchPane.uploadFile(instanceHRIDFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);

            const suppressFromDiscovery = false;
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 0, true);
            BulkEditActions.checkApplyToItemsRecordsCheckbox();
            BulkEditActions.confirmChanges();
            BulkEditActions.commitChanges();

            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Suppress from discovery');
            BulkEditSearchPane.verifyChangesUnderColumns(
              'Suppress from discovery',
              suppressFromDiscovery,
            );

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.checkHoldingsCheckbox();
            BulkEditLogs.clickActionsRunBy(user.username);

            BulkEditLogs.downloadFileUsedToTrigger();
            BulkEditFiles.verifyCSVFileRows(instanceHRIDFileName, [item.instanceHRID]);

            BulkEditLogs.downloadFileWithMatchingRecords();
            ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.holdingsHRID]);

            BulkEditLogs.downloadFileWithProposedChanges();
            ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [item.holdingsHRID]);

            BulkEditLogs.downloadFileWithUpdatedRecords();
            ExportFile.verifyFileIncludes(updatedRecordsFileName, [item.holdingsHRID]);

            TopMenuNavigation.navigateToApp('Inventory');
            InventoryInstances.searchByTitle(item.instanceName);
            InventoryInstances.selectInstance();
            InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

            TopMenuNavigation.navigateToApp('Inventory');
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
            ItemRecordView.waitLoading();
            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
            HoldingsRecordView.close();
            InventorySearchAndFilter.resetAll();

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
            ItemRecordView.waitLoading();
            ItemRecordView.suppressedAsDiscoveryIsAbsent();
          },
        );
      });
    });
  },
);
