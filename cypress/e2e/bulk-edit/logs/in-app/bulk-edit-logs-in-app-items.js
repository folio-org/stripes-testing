import TopMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../../support/dictionary/devTeams';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const validItemUUIDsFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  accessionNumber: getRandomPostfix()
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.inventoryAll.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });

          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
          FileManager.createFile(`cypress/fixtures/${validItemUUIDsFileName}`, item.itemBarcode);
        });
    });

    beforeEach('select item tab', () => {
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.checkItemsRadio();
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${validItemUUIDsFileName}`);
    });

    it('C375273 Verify generated Logs files for Items In app -- only valid Item UUIDs (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');

      BulkEditSearchPane.uploadFile(validItemUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditActions.downloadMatchedResults();

      const newLocation = 'Online';

      BulkEditActions.openActions();
      BulkEditActions.openInAppStartBulkEditFrom();
      BulkEditActions.replaceTemporaryLocation(newLocation);
      BulkEditActions.addNewBulkEditFilterString();
      BulkEditActions.replacePermanentLocation(newLocation);
      // 14
      BulkEditActions.addNewBulkEditFilterString();

      BulkEditActions.confirmChanges();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();
    });
  });
});
