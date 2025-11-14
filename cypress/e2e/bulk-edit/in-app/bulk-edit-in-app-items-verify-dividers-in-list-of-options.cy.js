import permissions from '../../../support/dictionary/permissions';
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
const folioInstance = {
  title: `AT_C648460_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryAll.gui]).then(
        (userProperties) => {
          user = userProperties;

          InventoryInstances.createInstanceViaApi(folioInstance.title, folioInstance.itemBarcode);

          FileManager.createFile(
            `cypress/fixtures/${itemBarcodesFileName}`,
            folioInstance.itemBarcode,
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioInstance.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C648460 Verify "Administrative data", "Item notes", "Loan and availability" and "Location" dividers are present in a list of options for Items Bulk edit (firebird)',
      { tags: ['extendedPath', 'firebird', 'C648460'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Items');
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(folioInstance.itemBarcode);
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyGroupOptionsInSelectOptionsDropdown('item');
        BulkEditActions.verifyItemOptions();
      },
    );
  });
});
