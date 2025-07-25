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
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  itemBarcode: getRandomPostfix(),
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
};
const matchedRecordsFileName = `Matched-Records-${itemBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${itemBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${itemBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('in-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.itemBarcode,
          );

          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);

          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${item.itemBarcode}"`,
          }).then((res) => {
            res.discoverySuppress = true;
            cy.updateItemViaApi(res);
          });
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
          cy.getInstanceById(item.instanceId).then((instance) => {
            instance.discoverySuppress = true;
            cy.updateInstance(instance);
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
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          itemBarcodesFileName,
          `*${matchedRecordsFileName}`,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
        );
      });

      it(
        'C651551 Verify generated Logs files for Holdings suppressed from discovery (Set false) (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C651551'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Item barcodes');
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);

          const suppressFromDiscovery = false;
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Suppress from discovery');
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 0, true);
          BulkEditActions.checkApplyToItemsRecordsCheckbox();
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.clearTemporaryLocation('holdings', 1);
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
          BulkEditFiles.verifyCSVFileRows(itemBarcodesFileName, [item.itemBarcode]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          ExportFile.verifyFileIncludes(`*${matchedRecordsFileName}`, [item.holdingsHRID]);

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
          InventoryInstance.verifyHoldingsTemporaryLocation('-');
          HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();

          TopMenuNavigation.navigateToApp('Inventory');
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.suppressedAsDiscoveryIsAbsent();
        },
      );
    });
  });
});
