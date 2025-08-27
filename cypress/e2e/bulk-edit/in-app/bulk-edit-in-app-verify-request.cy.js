import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const location = 'Online (E)';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
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
      { tags: ['extendedPath', 'firebird', 'C358973'] },
      () => {
        // Select "Inventory-items" record type => Select "Items barcode" from "Record identifier" dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        // Upload a .csv file with items barcodes by dragging it on the file drag and drop area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        //  Check the result of uploading the .csv file with Items barcodes
        BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');
        //  Click "Actions" menu => Select "Start Bulk edit" option
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyRowIcons();
        // Select "Permanent item location" from "Select option" dropdown => Select "Replace with" option from  "Select action" dropdown
        BulkEditActions.replacePermanentLocation(location);
        BulkEditActions.locationLookupExists();

        cy.intercept('/bulk-operations/*').as('confirmChanges');
        BulkEditActions.confirmChanges();
        cy.wait('@confirmChanges').then((interception) => {
          expect(interception.response.statusCode).to.equal(200);
          // Check if the intercepted request has status 500
          if (interception.response.statusCode === 500) {
            throw new Error('A request with status 500 was intercepted.');
          }
        });
      },
    );
  });
});
