import { Permissions } from '../../../support/dictionary';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    let userData = {};
    const instanceData = {
      instanceName: `C353652 testBulkEdit_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
    };
    const itemBarcodesFileName = `C353652 itemBarcodes_${getRandomPostfix()}.csv`;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.bulkEditView.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        InventoryInstances.createInstanceViaApi(
          instanceData.instanceName,
          instanceData.itemBarcode,
        );
        FileManager.createFile(
          `cypress/fixtures/${itemBarcodesFileName}`,
          instanceData.itemBarcode,
        );
        cy.login(userData.username, userData.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.itemBarcode);
    });

    it(
      'C353652 Verify item status to In-app bulk edit form (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C353652'] },
      () => {
        // #1 * Select the "Inventory - items", "Item barcode"
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

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
