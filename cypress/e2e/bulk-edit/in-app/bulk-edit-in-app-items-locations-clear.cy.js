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
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemActions from '../../../support/fragments/inventory/inventoryItem/itemActions';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);

        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${item.itemBarcode}"`,
        }).then((res) => {
          res.temporaryLocation = { id: '53cf956f-c1df-410b-8bea-27f712cca7c0' };
          res.permanentLocation = { id: '53cf956f-c1df-410b-8bea-27f712cca7c0'};
          ItemActions.editItemViaApi(res);
        });
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C353636 Verify in-app bulk edit clear location option (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();

        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.clearTemporaryLocation();
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.clearPermanentLocation('item', 1);
        BulkEditActions.confirmChanges();

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyPermanentLocation('');
        ItemRecordView.verifyTemporaryLocation('-');
      },
    );
  });
});
