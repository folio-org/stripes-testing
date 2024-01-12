import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
};

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
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, res.id);
            FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
            // Selected loan type
            res.permanentLoanType = { id: 'a1dc1ce3-d56f-4d8a-b498-d5d674ccc845' };
            cy.updateItemViaApi(res);
          },
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C409437 Verify progressbar starting bulk edit by changed identifiers _ Inventory (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
        BulkEditSearchPane.verifyDragNDropItemUUIDsArea();
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.checkForUploading(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        BulkEditSearchPane.verifyDragNDropItemBarcodeArea();
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.checkForUploading(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPermanentLoanType('Can circulate');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);

        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
        BulkEditSearchPane.verifyDragNDropItemUUIDsArea();
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.checkForUploading(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);
      },
    );
  });
});
