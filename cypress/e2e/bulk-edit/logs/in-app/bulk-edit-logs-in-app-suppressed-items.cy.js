import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

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

describe('bulk-edit', () => {
  describe('logs', () => {
    describe('in-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
          InventoryInstances.createInstanceViaApi(
            inventoryEntity.instanceName,
            inventoryEntity.itemBarcode,
          );
          cy.getItems({ query: `"barcode"=="${inventoryEntity.itemBarcode}"` }).then(
            (inventoryItem) => {
              inventoryItem.discoverySuppress = true;
              inventoryEntity.itemId = inventoryItem.id;
              InventoryItems.editItemViaApi(inventoryItem);
            },
          );
          FileManager.createFile(
            `cypress/fixtures/${validItemBarcodesFileName}`,
            inventoryEntity.itemBarcode,
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
        FileManager.deleteFile(`cypress/fixtures/${validItemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          validItemBarcodesFileName,
          `*${matchedRecordsFileName}`,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
        );
      });

      it(
        'C651557 Verify generated Logs files for Items suppressed from discovery (firebird)',
        { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C651557'] },
        () => {
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

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
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Suppress from discovery');
          BulkEditSearchPane.verifyChangesUnderColumns('Suppress from discovery', false);
          BulkEditActions.downloadChangedCSV();

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkItemsCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);

          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(validItemBarcodesFileName, [inventoryEntity.itemBarcode]);

          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            `*${matchedRecordsFileName}`,
            [inventoryEntity.itemId],
            'firstElement',
            true,
          );

          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyMatchedResultFileContent(
            previewOfProposedChangesFileName,
            [inventoryEntity.itemId],
            'firstElement',
            true,
          );

          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            updatedRecordsFileName,
            [inventoryEntity.itemId],
            'firstElement',
            true,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.suppressedAsDiscoveryIsAbsent();
          ItemRecordView.verifyPermanentLoanType('Selected');
        },
      );
    });
  });
});
