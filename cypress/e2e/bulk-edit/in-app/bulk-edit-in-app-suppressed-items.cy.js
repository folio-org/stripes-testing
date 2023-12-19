import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const itemUUIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;

const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
  id: '',
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
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
          (res) => {
            item.id = res.id;
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, item.id);
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
    });

    it(
      'C380641 Verify "Suppress from discovery" behaviour in Bulk Editing Items (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.downloadMatchedResults();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.editSuppressFromDiscovery(true);
        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        BulkEditActions.commitChanges();
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditSearchPane.waitFileUploading();

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();
      },
    );
  });
});
