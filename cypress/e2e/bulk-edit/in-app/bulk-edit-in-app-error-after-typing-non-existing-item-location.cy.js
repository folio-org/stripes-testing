import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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

describe('Bulk Edits', () => {
  describe('Bulk Edit - Items', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C359001 Error after typing non existing item location form in Bulk Edit (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        BulkEditSearchPane.verifyDragNDropItemBarcodeArea();

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.verifyOptionsDropdownPresent();
        BulkEditActions.verifyActionDropdownAbsent();

        BulkEditActions.selectOption('Temporary item location');
        BulkEditSearchPane.verifyInputLabel('Temporary item location');
        BulkEditActions.selectAction('Replace with', 0);
        BulkEditActions.locationLookupExists();
        BulkEditSearchPane.verifyInputLabel('Replace with');

        const newLocation = 'non-existing';
        BulkEditActions.fillLocation(newLocation);
        BulkEditActions.verifySearchSectionClosed();
        BulkEditSearchPane.verifyInputLabel('Select location');
      },
    );
  });
});
