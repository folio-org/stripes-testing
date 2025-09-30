import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C359152 Verify that no error after "Select location" option selected in Bulk Edit appeared (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C359152'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
          'Items',
          ITEM_IDENTIFIERS.ITEM_BARCODES,
        );

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();

        const newLocation = 'Annex';
        BulkEditActions.selectOption('Permanent item location');
        BulkEditActions.selectSecondAction('Replace with');
        BulkEditActions.selectLocation(newLocation, 0);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        BulkEditActions.clickSelectedLocation(newLocation, 'Select location');
        BulkEditActions.verifyConfirmButtonDisabled(true);

        BulkEditActions.clickSelectedLocation('Select location', newLocation);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, newLocation);
      },
    );
  });
});
