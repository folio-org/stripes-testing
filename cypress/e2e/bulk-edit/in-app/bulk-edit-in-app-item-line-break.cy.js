import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const items = [];
const itemBarcodes = [];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName);
const note = 'Line-1\nLine-2\n\nLine-3';
for (let i = 0; i < 5; i++) {
  items.push({
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: `barcode_${getRandomPostfix()}`,
  });
}

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        items.forEach((item) => {
          item.secondBarcode = 'secondBarcode_' + item.itemBarcode;
          itemBarcodes.push(item.itemBarcode, item.secondBarcode);
          FileManager.appendFile(
            `cypress/fixtures/${itemBarcodesFileName}`,
            `${item.itemBarcode}\n${item.secondBarcode}\n`,
          );
          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.byKeywords(items[0].instanceName);
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(`secondBarcode_${items[0].itemBarcode}`);
        ItemRecordView.waitLoading();
        InventoryItems.edit();
        ItemRecordEdit.addAdministrativeNote(note);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      items.forEach((item) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        changedRecordsFileName,
        previewFileName,
      );
    });

    it(
      'C399086 Verify Previews for the number of Items records if the record has a field with line breaks (firebird)',
      { tags: ['criticalPath', 'firebird', 'C399086'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
          'Items',
          ITEM_IDENTIFIERS.ITEM_BARCODES,
        );
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(...itemBarcodes);
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [note]);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Administrative note');
        BulkEditSearchPane.verifySpecificItemsMatched(note);

        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        const location = 'Annex';
        BulkEditActions.replaceTemporaryLocation(location);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(itemBarcodes.length, location);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [note]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [note]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        cy.reload();
        ItemRecordView.checkBarcode(`secondBarcode_${items[0].itemBarcode}`);
        ItemRecordView.verifyTemporaryLocation(location);
        InstanceRecordView.verifyAdministrativeNote(note);
      },
    );
  });
});
