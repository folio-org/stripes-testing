import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

let user;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk Edit - Logs', () => {
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
      cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.itemBarcode}"` }).then(
        (res) => {
          item.itemId = res.id;
          FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, item.itemId);
          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
        },
      );
    });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
  });

  it(
    'C380546 Verify that selected filters persist on Logs tab (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
      BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();

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
      BulkEditSearchPane.verifyLogsPane();
      BulkEditSearchPane.checkLogsCheckbox('Data modification');
      BulkEditSearchPane.checkHoldingsCheckbox();
      BulkEditSearchPane.verifyLogResultsFound();

      BulkEditSearchPane.openIdentifierSearch();
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
      BulkEditSearchPane.verifyDragNDropItemUUIDsArea();
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
      BulkEditSearchPane.verifyLogResultsFound();
      BulkEditSearchPane.verifyCheckboxIsSelected('DATA_MODIFICATION', true);
      BulkEditSearchPane.verifyCheckboxIsSelected('HOLDINGS_RECORD', true);
    },
  );
});
