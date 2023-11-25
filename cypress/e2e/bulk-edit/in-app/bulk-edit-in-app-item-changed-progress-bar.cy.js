import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

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
            item.hrid = FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, res.id);
            FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
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
      { tags: [testTypes.extendedPath, devTeams.firebird] },
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
        BulkEditActions.fillPermanentLoanType('Selected');
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
