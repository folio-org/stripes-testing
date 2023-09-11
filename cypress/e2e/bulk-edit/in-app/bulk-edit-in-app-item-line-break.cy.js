import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemActions from '../../../support/fragments/inventory/inventoryItem/itemActions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
const items = [];
const itemBarcodes = [];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${itemBarcodesFileName}`;
const changedRecordsFileName = `*-Changed-Records-${itemBarcodesFileName}`;
const previewFileName = `*-Updates-Preview-${itemBarcodesFileName}`;
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
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        items.forEach((item) => {
          item.secondBarcode = 'secondBarcode_' + item.itemBarcode;
          itemBarcodes.push(item.itemBarcode, item.secondBarcode);
          FileManager.appendFile(
            `cypress/fixtures/${itemBarcodesFileName}`,
            `${item.itemBarcode}\n${item.secondBarcode}\n`,
          );
          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        });
        InventorySearchAndFilter.byKeywords(items[0].instanceName);
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(`secondBarcode_${items[0].itemBarcode}`);
        ItemRecordView.waitLoading();
        ItemActions.edit();
        ItemRecordEdit.addAdministrativeNote(note);
        ItemRecordEdit.save();
        ItemRecordView.checkCalloutMessage();
        cy.visit(TopMenu.bulkEditPath);
      });
    });

    after('delete test data', () => {
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
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifyDragNDropItemBarcodeArea();
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(...itemBarcodes);
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [note]);
        BulkEditSearchPane.changeShowColumnCheckbox('Administrative notes');
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

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Barcode',
          `secondBarcode_${items[0].itemBarcode}`,
        );
        ItemRecordView.waitLoading();
        ItemRecordView.verifyTemporaryLocation(location);
        InstanceRecordView.verifyAdministrativeNote(note);
      },
    );
  });
});
