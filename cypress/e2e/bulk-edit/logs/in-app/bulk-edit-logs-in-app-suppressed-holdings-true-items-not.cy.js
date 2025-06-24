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
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { LOCATION_IDS } from '../../../../support/constants';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
const instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const matchedRecordsFileName = `*-Matched-Records-${instanceHRIDFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${instanceHRIDFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${instanceHRIDFileName}`;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
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
              permanentLocationId: LOCATION_IDS.POPULAR_READING_COLLECTION,
              temporaryLocationId: LOCATION_IDS.POPULAR_READING_COLLECTION,
            });
          });
          cy.getInstanceById(item.instanceId).then((body) => {
            body.discoverySuppress = true;
            cy.updateInstance(body);
            item.instanceHRID = body.hrid;
            FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, body.hrid);
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
        'C402321 Verify "Suppress from discovery" option is set True in when Holdings are suppressed and associated Items are not (firebird)',
        { tags: ['criticalPath', 'firebird', 'C402321'] },
        () => {
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');
          BulkEditSearchPane.uploadFile(instanceHRIDFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);

          const suppressFromDiscovery = true;
          const newLocation = 'Main Library';
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Suppress from discovery');
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 0, true);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.replacePermanentLocation(newLocation, 'holdings', 1);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.replaceTemporaryLocation(newLocation, 'holdings', 2);
          BulkEditActions.confirmChanges();
          BulkEditActions.commitChanges();

          BulkEditSearchPane.waitFileUploading();
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
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.selectViewHoldings();
          InventoryInstance.verifyHoldingsPermanentLocation(newLocation);
          InventoryInstance.verifyHoldingsTemporaryLocation(newLocation);
          HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
          HoldingsRecordView.close();
          InventorySearchAndFilter.resetAll();

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.suppressedAsDiscoveryIsPresent();
        },
      );
    });
  });
});
