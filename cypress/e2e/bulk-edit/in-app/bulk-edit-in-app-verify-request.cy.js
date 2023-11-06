import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import DevTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const location = 'Online (E)';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditView.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
      });
    });

    after('Delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C358973 Verify request to /bulk-edit/{UUID}/start (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        // Select "Inventory-items" record type => Select "Items barcode" from "Record identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        // Upload a .csv file with items barcodes by dragging it on the file drag and drop area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        //  Check the result of uploading the .csv file with Items barcodes
        BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
        BulkEditSearchPane.verifyPaneRecordsCount(1);
        //  Click "Actions" menu => Select "Start Bulk edit" option
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();
        // Select "Permanent item location" from "Select option" dropdown => Select "Replace with" option from  "Select action" dropdown
        BulkEditActions.replacePermanentLocation(location);
        BulkEditActions.locationLookupExists();
        // Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.itemBarcode);
      },
    );
  });
});
