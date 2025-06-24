import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user1;
let user2;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
        user1 = userProperties;
      });
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.uiUserEdit.gui,
        permissions.inventoryAll.gui,
        permissions.uiUsersDelete.gui,
        permissions.uiUsersCheckTransactions.gui,
      ]).then((userProperties) => {
        user2 = userProperties;
      });

      InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
      FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user2.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C378102 Verify that items updated by a user account that no longer exists are bulk editing (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C378102'] },
      () => {
        cy.login(user1.username, user1.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.closeDetailView();
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(item.itemBarcode);
        InventoryInstance.edit();
        const location = 'Online';
        InstanceRecordEdit.chooseTemporaryLocation(location);
        ItemRecordEdit.saveAndClose({ itemSaved: true });

        cy.login(user2.username, user2.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        Users.deleteViaApi(user1.userId);
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        const status = 'Intellectual item';
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceItemStatus(status);
        BulkEditActions.confirmChanges();

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyChangesUnderColumns('Status', status);
      },
    );
  });
});
