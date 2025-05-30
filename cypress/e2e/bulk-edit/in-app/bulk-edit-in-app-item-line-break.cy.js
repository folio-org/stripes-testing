import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const instances = [];
const itemBarcodes = [];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName);
const note = 'Line-1\nLine-2\n\nLine-3';
for (let i = 0; i < 5; i++) {
  instances.push({
    instanceName: `AT_C399086_FolioInstance_${getRandomPostfix()}`,
    itemBarcode: `barcode_${getRandomPostfix()}`,
  });
}

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        instances.forEach((instance) => {
          instance.secondBarcode = 'secondBarcode_' + instance.itemBarcode;
          itemBarcodes.push(instance.itemBarcode, instance.secondBarcode);

          FileManager.appendFile(
            `cypress/fixtures/${itemBarcodesFileName}`,
            `${instance.itemBarcode}\n${instance.secondBarcode}\n`,
          );
          InventoryInstances.createInstanceViaApi(instance.instanceName, instance.itemBarcode);

          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${instance.itemBarcode}"`,
          }).then((res) => {
            const itemData = res;
            itemData.administrativeNotes = [note];
            cy.updateItemViaApi(itemData);
          });
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      instances.forEach((item) => {
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
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', instances[0].itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode(instances[0].itemBarcode);
        ItemRecordView.verifyTemporaryLocation(location);
        InstanceRecordView.verifyAdministrativeNote(note);
      },
    );
  });
});
