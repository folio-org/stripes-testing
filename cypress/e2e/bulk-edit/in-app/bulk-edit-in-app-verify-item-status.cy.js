import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    let userData = {};
    const instanceData = {
      instanceName: `C353652 testBulkEdit_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
    };
    let fileContent = '';
    const itemBarcodesFileName = `C353652 itemBarcodes_${getRandomPostfix()}.csv`;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.bulkEditView.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        cy.login(userData.username, userData.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(
          instanceData.instanceName,
          instanceData.itemBarcode,
        );
        fileContent += instanceData.itemBarcode;
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, fileContent);
      });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(userData.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C353652 Verify item status to In-app bulk edit form (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        // #1 * Select the "Inventory - items", "Item barcode"
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        // #2 Upload a .csv file with valid Item barcodes
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // #3 Click "Actions" menu => Select "Start bulk edit"
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyRowIcons();

        // #4 Select "Item status" option in the "Select option" dropdown
        BulkEditActions.selectOption('Item status');
        BulkEditActions.replaceWithIsDisabled();

        // #5 Verify available options
        BulkEditActions.verifyItemStatusOptions();
      },
    );
  });
});
