import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const folioInstance = {
  title: `AT_C423648_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const holdingUUIDsFileName = `AT_C423648_holding_uuids_${getRandomPostfix()}.csv`;
const itemUUIDsFileName = `AT_C423648_item_uuids_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        folioInstance.instanceId = InventoryInstances.createInstanceViaApi(
          folioInstance.title,
          folioInstance.itemBarcode,
        );

        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"items.barcode"=="${folioInstance.itemBarcode}"`,
        }).then((instance) => {
          folioInstance.holdingId = instance.holdings[0].id;
          folioInstance.holdingHrid = instance.holdings[0].hrid;
          folioInstance.itemId = instance.items[0].id;

          FileManager.createFile(
            `cypress/fixtures/${holdingUUIDsFileName}`,
            folioInstance.holdingId,
          );

          FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, folioInstance.itemId);
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioInstance.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
    });

    it(
      'C423648 User with "data - UI-Bulk-Edit Inventory - edit" and "data - UI-Inventory Instance - edit" permissions is NOT able to start bulk edit of Holdings, Items (firebird)',
      { tags: ['extendedPath', 'firebird', 'C423648'] },
      () => {
        // Step 1: Select "Inventory - holdings" radio button and "Holding UUIDs" identifier
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);

        // Step 2: Upload CSV file with valid Holding UUID and check result
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(folioInstance.holdingHrid);

        // Step 3: Click "Actions" menu and verify available options
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.startBulkEditAbsent();

        // Step 4: Select "Inventory - items" radio button and "Item UUIDs" identifier
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);

        // Step 5: Upload CSV file with valid Item UUIDs and check result
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(folioInstance.itemBarcode);

        // Step 6: Click "Actions" menu and verify available options
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.startBulkEditAbsent();
      },
    );
  });
});
