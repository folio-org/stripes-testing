import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const itemUUIDsMatchedRecordsFileName = `*Matched-Records-${itemUUIDsFileName}`;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const holdingsUUIDsMatchedRecordsFileName = `*Matched-Records-${holdingUUIDsFileName}`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

        cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.itemBarcode}"` }).then(
          (itemData) => {
            item.UUID = itemData.id;
            item.holdingsUUID = itemData.holdingsRecordId;
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, itemData.id);
            FileManager.createFile(
              `cypress/fixtures/${holdingUUIDsFileName}`,
              itemData.holdingsRecordId,
            );
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
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        itemUUIDsMatchedRecordsFileName,
        holdingsUUIDsMatchedRecordsFileName,
      );
    });

    it(
      'C423649 User with "Bulk Edit: In app - View inventory records" and "Inventory: View, create, edit instances" permissions is able to view Holdings, Items in "Bulk edit" (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423649'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('1 holdings');
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Holdings UUID');
        BulkEditSearchPane.verifyMatchedResults(item.holdingsUUID);
        BulkEditActions.startBulkEditAbsent();
        ExportFile.verifyFileIncludes(holdingsUUIDsMatchedRecordsFileName, [item.holdingsUUID]);

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');
        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Item UUID');
        BulkEditSearchPane.verifyMatchedResults(item.UUID);
        BulkEditActions.startBulkEditAbsent();
        ExportFile.verifyFileIncludes(itemUUIDsMatchedRecordsFileName, [item.holdingsUUID]);
      },
    );
  });
});
