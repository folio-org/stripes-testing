import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

let user;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
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
            const itemData = res;
            res.effectiveCallNumberComponents = {
              callNumber: `callNumber;-${getRandomPostfix()}`,
            };
            cy.updateItemViaApi(itemData);
          },
        );
      });
      FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C365124 Verify that preview of records matched is populated if Items call number contains semicolon (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        const type = 'Can circulate';
        BulkEditActions.fillTemporaryLoanType(type);

        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyTemporaryLoanType(type);
      },
    );
  });
});
