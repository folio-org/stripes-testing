import testTypes from '../../../../support/dictionary/testTypes';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ItemActions from '../../../../support/fragments/inventory/inventoryItem/itemActions';
import TopMenu from '../../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';

let user;

const validItemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `Matched-Records-${validItemBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${validItemBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${validItemBarcodesFileName}`;

const inventoryEntity = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  itemId: '',
};

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditLogsView.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      InventoryInstances.createInstanceViaApi(
        inventoryEntity.instanceName,
        inventoryEntity.itemBarcode,
      );
      cy.getItems({ query: `"barcode"=="${inventoryEntity.itemBarcode}"` }).then(
        (inventoryItem) => {
          inventoryItem.discoverySuppress = true;
          inventoryEntity.itemId = inventoryItem.id;
          ItemActions.editItemViaApi(inventoryItem);
        },
      );
      FileManager.createFile(
        `cypress/fixtures/${validItemBarcodesFileName}`,
        inventoryEntity.itemBarcode,
      );
    });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${validItemBarcodesFileName}`);
    FileManager.deleteFileFromDownloadsByMask(
      validItemBarcodesFileName,
      `*${matchedRecordsFileName}`,
      previewOfProposedChangesFileName,
      updatedRecordsFileName,
    );
  });

  it(
    'C380761 Verify generated Logs files for Items suppressed from discovery (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');

      BulkEditSearchPane.uploadFile(validItemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditActions.downloadMatchedResults();
      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.editSuppressFromDiscovery(false);
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.fillPermanentLoanType('Selected', 1);
      BulkEditActions.confirmChanges();
      BulkEditActions.downloadPreview();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.openActions();
      BulkEditSearchPane.changeShowColumnCheckbox('Suppress from discovery');
      BulkEditSearchPane.verifyChangesUnderColumns('Suppress from discovery', false);
      BulkEditActions.downloadChangedCSV();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.checkItemsCheckbox();
      BulkEditSearchPane.clickActionsRunBy(user.username);

      BulkEditSearchPane.downloadFileUsedToTrigger();
      BulkEditFiles.verifyCSVFileRows(validItemBarcodesFileName, [inventoryEntity.itemBarcode]);

      BulkEditSearchPane.downloadFileWithMatchingRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        `*${matchedRecordsFileName}`,
        [inventoryEntity.itemId],
        'firstElement',
        true,
      );

      BulkEditSearchPane.downloadFileWithProposedChanges();
      BulkEditFiles.verifyMatchedResultFileContent(
        previewOfProposedChangesFileName,
        [inventoryEntity.itemId],
        'firstElement',
        true,
      );

      BulkEditSearchPane.downloadFileWithUpdatedRecords();
      BulkEditFiles.verifyMatchedResultFileContent(
        updatedRecordsFileName,
        [inventoryEntity.itemId],
        'firstElement',
        true,
      );

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.itemBarcode);
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsAbsent();
      ItemRecordView.verifyPermanentLoanType('Selected');
    },
  );
});
