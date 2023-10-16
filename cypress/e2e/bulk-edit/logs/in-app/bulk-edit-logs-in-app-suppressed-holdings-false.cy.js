import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
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

let user;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  itemBarcode: getRandomPostfix(),
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
};
const matchedRecordsFileName = `Matched-Records-${itemBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${itemBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${itemBarcodesFileName}`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.inventoryAll.gui,
      permissions.bulkEditLogsView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });

      item.instanceId = InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
      );

      FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);

      cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.itemBarcode}"` }).then(
        (res) => {
          res.discoverySuppress = true;
          cy.updateItemViaApi(res);
        },
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
          permanentLocationId: 'b241764c-1466-4e1d-a028-1a3684a5da87',
          temporaryLocationId: 'b241764c-1466-4e1d-a028-1a3684a5da87',
        });
      });
      cy.getInstanceById(item.instanceId).then((instance) => {
        instance.discoverySuppress = true;
        cy.updateInstance(instance);
      });
    });
  });

  after('delete test data', () => {
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
    'C399063 Verify generated Logs files for Holdings suppressed from discovery (Set false) (firebird) (TaaS)',
    { tags: [testTypes.extendedPath, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDragNDropHoldingsItemBarcodesArea();
      BulkEditSearchPane.uploadFile(itemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyMatchedResults(item.holdingsHRID);

      const suppressFromDiscovery = false;
      BulkEditActions.openActions();
      BulkEditSearchPane.changeShowColumnCheckbox('Suppress from discovery');
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
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(itemBarcodesFileName, [item.itemBarcode]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileName}`,
        [item.itemBarcode],
        'holdingsItemBarcode',
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [item.itemBarcode],
        'holdingsItemBarcode',
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [item.itemBarcode],
        'holdingsItemBarcode',
      );

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
