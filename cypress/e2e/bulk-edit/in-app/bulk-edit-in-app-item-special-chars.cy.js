import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const secondItemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `barcode-*%$+/${getRandomPostfix()}`,
};
const secondItem = {
  instanceName: `testBulkEdit-*%$+/${getRandomPostfix()}`,
  itemBarcode: `barcode-${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.itemBarcode);
        InventoryInstances.createInstanceViaApi(secondItem.instanceName, secondItem.itemBarcode);
        FileManager.createFile(
          `cypress/fixtures/${secondItemBarcodesFileName}`,
          secondItem.itemBarcode,
        );
      });
    });

    beforeEach('login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
        'Items',
        ITEM_IDENTIFIERS.ITEM_BARCODES,
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${secondItemBarcodesFileName}`);
    });

    it(
      'C358984 Verify Bulk Edit barcodes with special characters --In app (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C358984'] },
      () => {
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        const status = 'Intellectual item';
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.replaceItemStatus(status);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, item.itemBarcode);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(item.itemBarcode);
      },
    );

    it(
      'C358978 Verify Bulk Edit Items that contains special characters in the title (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C358978'] },
      () => {
        BulkEditSearchPane.uploadFile(secondItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        const status = 'Intellectual item';
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Instance (Title, Publisher, Publication date)',
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.replaceItemStatus(status);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1, `${secondItem.instanceName}. MIT`);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangedResults(`${secondItem.instanceName}. MIT`);
      },
    );
  });
});
