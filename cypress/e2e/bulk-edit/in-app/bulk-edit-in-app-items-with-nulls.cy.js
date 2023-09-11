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

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  id: '',
};
const itemIDsFileName = `itemIdsFileName_${getRandomPostfix()}.csv`;

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

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.itemBarcode}"` }).then(
          (res) => {
            item.id = res.id;
            const itemData = { ...res };
            itemData.tags.tagList = null;
            itemData.yearCaption = null;
            itemData.electronicAccess = null;
            itemData.statisticalCodeIds = null;
            itemData.purchaseOrderLineIdentifier = null;
            cy.updateItemViaApi(itemData).then((_) => {
              FileManager.createFile(`cypress/fixtures/${itemIDsFileName}`, item.id);
            });
          },
        );
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemIDsFileName}`);
    });

    it(
      'C380583 Verify bulk edit of Item record that contains NULL values in reference data (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

        BulkEditSearchPane.uploadFile(itemIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        const newLocation = 'Online';

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.clearTemporaryLocation();
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replacePermanentLocation(newLocation, 'item', 1);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyChangedResults(newLocation);
      },
    );
  });
});
