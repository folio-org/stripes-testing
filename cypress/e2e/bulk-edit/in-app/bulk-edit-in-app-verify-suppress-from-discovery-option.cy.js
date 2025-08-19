import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const instanceHRIDFileName = `instanceHRID_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceHRIDFileName);
const previewOfProposedChangesFileName = BulkEditFiles.getPreviewFileName(instanceHRIDFileName);

describe('Bulk-edit', () => {
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
        cy.getItems({ query: `"barcode"=="${item.itemBarcode}"` }).then((inventoryItem) => {
          inventoryItem.discoverySuppress = true;
          item.itemId = inventoryItem.id;
          InventoryItems.editItemViaApi(inventoryItem);
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${item.instanceId}"` }).then(
          (instance) => {
            item.instanceHRID = instance.hrid;
            FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, item.instanceHRID);
          },
        );
        cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then(
          (holdings) => {
            item.holdingsHRID = holdings[0].hrid;
          },
        );
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
        matchedRecordsFileName,
        previewOfProposedChangesFileName,
      );
    });

    it(
      'C402323 Verify "Suppress from discovery" option in case Holdings not suppressed Items suppressed  (Set false) (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C402323'] },
      () => {
        // Select the "Inventory-holdings" radio button on  the "Record types" accordion => Select "Instance HRIDs" option from the "Record identifier" dropdown

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Instance HRIDs');

        // Upload a .csv file  with "Instance HRIDs" (see preconditions) by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        BulkEditSearchPane.waitFileUploading();

        // Click "Actions" menu => "Download matched records (CSV)"
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.holdingsHRID]);

        // Click on "Actions" menu => Check the "Suppress from discovery" checkbox (if not yet checked)
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Suppress from discovery');

        // Click on "Actions" menu => Select the "Start bulk edit" element
        BulkEditActions.openStartBulkEditForm();

        // Click on "Select option" dropdown => Select "Suppress from discovery" option
        // Select "Set false" option and check checkbox displayed followed with the label "Apply to items records"
        const suppressFromDiscovery = false;
        BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 0, true);
        BulkEditActions.checkApplyToItemsRecordsCheckbox();

        // Сlick on "Confirm changes" button
        BulkEditActions.confirmChanges();

        // Click on "Download preview" button
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewOfProposedChangesFileName, [item.holdingsHRID]);
        // Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyReasonForError(
          'No change in value for holdings record required, associated suppressed item(s) have been updated.',
        );

        // Navigate to "Inventory" app => Search for a recently edited Holding records => Click on "View Holdings"
        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords(item.instanceName);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();

        // Expand recently edited Holding records accordion => Click links in "Item: barcode" column for Items records associated with recently edited Holding records
        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsAbsent();
      },
    );
  });
});
