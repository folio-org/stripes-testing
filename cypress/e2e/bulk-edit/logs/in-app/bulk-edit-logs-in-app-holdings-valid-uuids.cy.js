import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/itemRecordView';

let user;
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileNameValid = `Matched-Records-${validHoldingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${validHoldingUUIDsFileName}`;
// It downloads 2 files in one click, both with same content
const previewOfProposedChangesFileName = {
  first: `*-Updates-Preview-${validHoldingUUIDsFileName}`,
  second: `modified-*-${matchedRecordsFileNameValid}`
};
const updatedRecordsFileName = `result-*-${matchedRecordsFileNameValid}`;
const inventoryEntity = {
  instance: {
    id: '',
    name: `testBulkEdit_${getRandomPostfix()}`,
  },
  item: {
    id: '',
    id2: '',
    barcode: getRandomPostfix(),
  },
  holdingId: '',
  locations: {
    permanent: {
      id: '',
      name: '',
    },
  }
};

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.inventoryAll.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading
        });

        inventoryEntity.instance.id = InventoryInstances.createInstanceViaApi(inventoryEntity.instance.name, inventoryEntity.item.barcode);
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${inventoryEntity.instance.id}"`
        })
          .then(holdings => {
            inventoryEntity.holdingId = holdings[0].id;
            inventoryEntity.locations.permanent.id = holdings[0].permanentLocationId;
            FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, inventoryEntity.holdingId);

            cy.getLocations({ limit: 1, query: `id="${inventoryEntity.locations.permanent.id}"` })
              .then(loc => { inventoryEntity.locations.permanent.name = loc.name; });
            cy.getItems({ query: `"barcode"=="${inventoryEntity.item.barcode}"` })
              .then(inventoryItem => { inventoryEntity.item.id = inventoryItem.id; });
            cy.getItems({ query: `"barcode"=="secondBarcode_${inventoryEntity.item.barcode}"` })
              .then(inventoryItem => { inventoryEntity.item.id2 = inventoryItem.id; console.log(inventoryEntity); console.log(inventoryItem); });
          });
      });
  });

  // after('delete test data', () => {
  //   Users.deleteViaApi(user.userId);
  //   InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
  //   FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
  //   // FileManager.deleteFileFromDownloadsByMask(validHoldingUUIDsFileName, `*${matchedRecordsFileNameValid}`, changedRecordsFileName, previewOfProposedChangesFileName.first, previewOfProposedChangesFileName.second, updatedRecordsFileName);
  // });

  it('C375288 Verify generated Logs files for Items In app -- only valid Holdings UUIDs (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    BulkEditSearchPane.checkItemsRadio();
    BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');

    BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
    BulkEditSearchPane.waitFileUploading();
    BulkEditActions.downloadMatchedResults();
    BulkEditActions.openInAppStartBulkEditFrom();

    BulkEditActions.clearTemporaryLocation();
    BulkEditActions.addNewBulkEditFilterString();
    BulkEditActions.replacePermanentLocation(inventoryEntity.locations.permanent.name, 'item', 1);
    BulkEditActions.addNewBulkEditFilterString();
    BulkEditActions.replaceItemStatus('Available', 2);

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
    BulkEditFiles.verifyCSVFileRows(validHoldingUUIDsFileName, [inventoryEntity.holdingId]);

    BulkEditSearchPane.downloadFileWithMatchingRecords();
    BulkEditFiles.verifyMatchedResultFileContent(`*${matchedRecordsFileNameValid}`, [inventoryEntity.item.id, inventoryEntity.item.id2], 'firstElement', true);

    BulkEditSearchPane.downloadFileWithProposedChanges();
    BulkEditFiles.verifyMatchedResultFileContent(previewOfProposedChangesFileName.first, ['', ''], 'temporaryLocation', true);
    BulkEditFiles.verifyMatchedResultFileContent(previewOfProposedChangesFileName.second, ['', ''], 'temporaryLocation', true);

    BulkEditSearchPane.downloadFileWithUpdatedRecords();
    BulkEditFiles.verifyMatchedResultFileContent(updatedRecordsFileName, ['', ''], 'temporaryLocation', true);

    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.item.barcode);
    ItemRecordView.checkItemDetails(inventoryEntity.locations.permanent.name, inventoryEntity.item.barcode, 'Available');
  });
});
