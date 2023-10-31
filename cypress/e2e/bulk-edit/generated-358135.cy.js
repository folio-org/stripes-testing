import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../support/dictionary/devTeams';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import FileManager from '../../support/utils/fileManager';
import Users from '../../support/fragments/users/users';
import BulkEditActions from '../../support/fragments/bulk-edit/bulk-edit-actions';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import ExportFile from '../../support/fragments/data-export/exportFile';

describe('Bulk Edit - Items', () => {
  let user;
  const items = [];
  const itemBarcodes = [];
  const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
  const newLocation = 'Annex';
  const matchedRecordsFileName = `Matched-Records-${itemBarcodesFileName}`;
  const previewOfProposedChangesFileName = `*-Updates-Preview-${itemBarcodesFileName}`;
  const updatedRecordsFileName = `*-Changed-Records*-${itemBarcodesFileName}`;
  const note = 'Line-1\nLine-2\n\nLine-3';

  // prepare names for 5 instances with 2 items = 10 items
  for (let i = 0; i < 5; i++) {
    items.push({
      instanceName: `testBulkEdit_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
    });
  }

  before('Create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });

      let fileContent = '';
      items.forEach((item) => {
        item.secondBarcode = 'secondBarcode_' + item.itemBarcode;
        itemBarcodes.push(item.itemBarcode, item.secondBarcode);
        fileContent += `${item.itemBarcode}\r\n${item.secondBarcode}\r\n`;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
      });

      FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, fileContent);
    });
  });

  after('Delete test data', () => {
    items.forEach((item) => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    });
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
  });

  it(
    'C358135 Verify that user can bulk edit item status and temporary location at once (firebird) (null)',
    { tags: [testTypes.extendedPath, devTeams.firebird] },
    () => {
      // #1 Select "Inventory-items" record type => Select "Items barcode" from "Record identifier" dropdown
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');
      // #2 Upload a .csv file with items barcodes (see Preconditions) by dragging it on the file drag and drop area
      BulkEditSearchPane.uploadFile(itemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();
      // #3 Check the result of uploading the .csv file with Items barcodes
      BulkEditSearchPane.verifyMatchedResults(...itemBarcodes);
      BulkEditSearchPane.verifyPaneRecordsCount(10);
      //   // #4 Click "Actions" menu => Check checkboxes (if not yet checked) next to:
      BulkEditActions.openActions();
      BulkEditSearchPane.changeShowColumnCheckbox('Status');
      BulkEditSearchPane.changeShowColumnCheckbox('Item temporary location');
      BulkEditActions.openActions();
      BulkEditActions.downloadMatchedResults();
      // ExportFile.verifyFileIncludes(matchedRecordsFileName, [note]);
      //   // #6 Click "Actions" menu => Select "Start Bulk edit" option
      BulkEditActions.openActions();
      BulkEditActions.openInAppStartBulkEditFrom();
      //   // BulkEditActions.verifyItemStatusOptions();
      BulkEditActions.verifyRowIcons();
      //   // #7 Select "Temporary item location" from  "Options" dropdown => Select "Replace with" option from  "Select option" dropdown
      BulkEditActions.replaceTemporaryLocation(newLocation, 'item');
      BulkEditActions.locationLookupExists();
      // #9 Click on the "Plus" icon
      BulkEditActions.addNewBulkEditFilterString();
      // #10 Select "Item status" from  "Options" dropdown on the new row => Select item status in "Select item status" dropdown **so that at least for one Item its status changed** => Click "Confirm changes" button
      BulkEditActions.replaceItemStatus('Intellectual item', 1);
      BulkEditActions.confirmChanges();
      BulkEditActions.verifyAreYouSureForm(itemBarcodes.length, newLocation);
      // #11 Click the "Download preview" button
      BulkEditActions.downloadPreview();
      // #12 Click the "Commit changes"  button
      BulkEditActions.commitChanges();
      // #13 Click the "Actions" menu => Select "Download changed records (CSV)" element
      BulkEditActions.openActions();
      BulkEditActions.downloadChangedCSV();
      // #14 Go to the "Inventory" app => Search for the updated Items
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToItem();
      // * The Items status and temporary location are updated accordingly
    },
  );
});
