import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;

const firstItem = {
  barcode: `firstItem-${getRandomPostfix()}`,
  instanceName: `firstInstance-${getRandomPostfix()}`,
};
const secondItem = {
  barcode: `secondItem-${getRandomPostfix()}`,
  instanceName: `secondInstance-${getRandomPostfix()}`,
};
const thirdItem = {
  barcode: `thirdItem-${getRandomPostfix()}`,
  instanceName: `thirdInstance-${getRandomPostfix()}`,
};
const allBarcodes = [
  firstItem.barcode,
  `secondBarcode_${firstItem.barcode}`,
  secondItem.barcode,
  `secondBarcode_${secondItem.barcode}`,
  thirdItem.barcode,
  `secondBarcode_${thirdItem.barcode}`,
];
const newBarcodes = [
  `1017625*-AMA${getRandomPostfix()}`,
  `1017625345-AMA${getRandomPostfix()}`,
  `101762534?-BBB${getRandomPostfix()}`,
  `1017625345-BBB${getRandomPostfix()}`,
  `1017625345^DDD${getRandomPostfix()}`,
  `1017625345${getRandomPostfix()}`,
];
const itemsToEdit = [newBarcodes[0], newBarcodes[2], newBarcodes[4]];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        // Create three instances with two barcodes each
        [firstItem, secondItem, thirdItem].forEach((item) => {
          InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        });

        // Update all six items with new barcodes
        for (let i = 0; i < allBarcodes.length; i++) {
          cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${allBarcodes[i]}"` }).then(
            (res) => {
              res.barcode = newBarcodes[i];
              cy.updateItemViaApi(res);
            },
          );
        }

        // Put three item barcodes into file
        FileManager.createFile(
          `cypress/fixtures/${itemBarcodesFileName}`,
          `${newBarcodes[0]}\n${newBarcodes[2]}\n${newBarcodes[4]}`,
        );

        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      itemsToEdit.forEach((item) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      FileManager.deleteFileFromDownloadsByMask(changedRecordsFileName);
    });

    it(
      'C399065 Verify that special characters in Item Barcode are NOT treated as wildcards for Bulk Edit (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C399065'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(newBarcodes[0], newBarcodes[2], newBarcodes[4]);
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, itemsToEdit);

        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replacePermanentLocation('Online (E)');
        BulkEditActions.confirmChanges();
        [newBarcodes[0], newBarcodes[2], newBarcodes[4]].forEach((barcode) => {
          BulkEditActions.verifyChangesInAreYouSureForm('Barcode', [barcode]);
        });
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, itemsToEdit);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();

        itemsToEdit.forEach((item) => {
          InventorySearchAndFilter.searchByParameter('Barcode', item);
          ItemRecordView.waitLoading();
          ItemRecordView.verifyPermanentLocation('Online');
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
