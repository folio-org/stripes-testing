import TopMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../../support/dictionary/devTeams';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../../support/fragments/inventory/itemRecordView';

let user;
const validItemUUIDsFileName = `validItemUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${validItemUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records*-${validItemUUIDsFileName}`;
// It downloads 2 files in one click, both with same content
const previewOfProposedChangesFileName = {
  first: `*-Updates-Preview-${validItemUUIDsFileName}`,
  second: `modified-*-${matchedRecordsFileName}`
};
const updatedRecordsFileName = `result-*-${matchedRecordsFileName}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  accessionNumber: getRandomPostfix(),
  instanceId: '',
  itemId: '',
};

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditLogsView.gui,
      permissions.inventoryAll.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading
        });

        item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${item.itemBarcode}"` })
          .then((instance) => {
            item.itemId = instance.items[0].id;
            FileManager.createFile(`cypress/fixtures/${validItemUUIDsFileName}`, item.itemId);
          });
      });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${validItemUUIDsFileName}`);
    FileManager.deleteFileFromDownloadsByMask(validItemUUIDsFileName, `*${matchedRecordsFileName}`, changedRecordsFileName, previewOfProposedChangesFileName.first, previewOfProposedChangesFileName.second, updatedRecordsFileName);
  });

  it('C375273 Verify generated Logs files for Items In app -- only valid Item UUIDs (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.checkItemsRadio();
    BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

    BulkEditSearchPane.uploadFile(validItemUUIDsFileName);
    BulkEditSearchPane.waitFileUploading();
    BulkEditActions.downloadMatchedResults();

    const newLocation = 'Online';

    BulkEditActions.openInAppStartBulkEditFrom();
    BulkEditActions.replaceTemporaryLocation(newLocation, 'item', 0);
    BulkEditActions.addNewBulkEditFilterString();
    BulkEditActions.replacePermanentLocation(newLocation, 'item', 1);
    BulkEditActions.addNewBulkEditFilterString();
    BulkEditActions.replaceItemStatus('Available', 2);
    BulkEditActions.addNewBulkEditFilterString();
    BulkEditActions.fillTemporaryLoanType('Reading room', 3);
    BulkEditActions.addNewBulkEditFilterString();
    BulkEditActions.fillPermanentLoanType('Selected', 4);
    BulkEditActions.confirmChanges();
    BulkEditActions.downloadPreview();
    BulkEditActions.commitChanges();
    BulkEditSearchPane.waitFileUploading();
    BulkEditActions.openActions();
    BulkEditActions.downloadChangedCSV();

    BulkEditSearchPane.openLogsSearch();
    BulkEditSearchPane.checkItemsCheckbox();
    BulkEditSearchPane.clickActionsRunBy(user.username);
    BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

    BulkEditSearchPane.downloadFileUsedToTrigger();
    BulkEditFiles.verifyCSVFileRows(validItemUUIDsFileName, [item.itemId]);

    BulkEditSearchPane.downloadFileWithMatchingRecords();
    BulkEditFiles.verifyMatchedResultFileContent(`*${matchedRecordsFileName}`, [item.itemId], 'firstElement', true);

    BulkEditSearchPane.downloadFileWithProposedChanges();
    BulkEditFiles.verifyMatchedResultFileContent(previewOfProposedChangesFileName.first, [item.itemId], 'firstElement', true);

    BulkEditSearchPane.downloadFileWithUpdatedRecords();
    BulkEditFiles.verifyMatchedResultFileContent(updatedRecordsFileName, [item.itemId], 'firstElement', true);

    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
    ItemRecordView.waitLoading();
    ItemRecordView.closeDetailView();
    InventoryInstance.openHoldings(['']);
    InventoryInstance.verifyCellsContent(newLocation, 'Available', 'Reading room');
  });
});
