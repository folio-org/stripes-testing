import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('Create test data', () => {
        cy.createTempUser(
          [
            Permissions.uiUsersView.gui,
            Permissions.bulkEditUpdateRecords.gui,
            Permissions.uiUserEdit.gui,
            Permissions.inventoryAll.gui,
            Permissions.bulkEditView.gui,
            Permissions.bulkEditEdit.gui,
            Permissions.bulkEditCsvView.gui,
            Permissions.bulkEditCsvEdit.gui,
            Permissions.bulkEditLogsView.gui,
          ],
          'faculty',
        ).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${item.itemBarcode}"`,
          }).then((res) => {
            item.itemId = res.id;
            FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, item.itemId);
            FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
          });
        });
      });

      after('delete test data', () => {
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      });

      it(
        'C380546 Verify that selected filters persist on Logs tab (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C380546'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');

          BulkEditSearchPane.uploadFile(userBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(user.barcode);

          BulkEditActions.openActions();
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.fillPatronGroup('staff (Staff Member)');
          BulkEditActions.confirmChanges();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults('staff');

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkLogsCheckbox('Data modification');
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.verifyLogResultsFound();

          BulkEditSearchPane.openIdentifierSearch();
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          const newLocation = 'Online';
          BulkEditActions.openActions();
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.replaceTemporaryLocation(newLocation, 'item', 0);
          BulkEditActions.confirmChanges();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyChangedResults('Online');

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogResultsFound();
          BulkEditLogs.verifyCheckboxIsSelected('DATA_MODIFICATION', true);
          BulkEditLogs.verifyCheckboxIsSelected('HOLDINGS_RECORD', true);
        },
      );
    });
  });
});
