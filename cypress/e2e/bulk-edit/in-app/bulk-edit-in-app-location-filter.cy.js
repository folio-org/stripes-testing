import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const validItemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create user', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        FileManager.createFile(`cypress/fixtures/${validItemBarcodesFileName}`, item.itemBarcode);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    beforeEach('select item tab', () => {
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.checkItemsRadio();
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${validItemBarcodesFileName}`);
    });

    it(
      'C357053 Negative: Verify enable type ahead in location look-up (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(validItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();

        BulkEditActions.typeInTemporaryLocationFilter(`test_location_${getRandomPostfix()}`);
        BulkEditActions.verifyNoMatchingOptionsForLocationFilter();

        BulkEditActions.cancel();
      },
    );

    it(
      'C356787 Verify enable type ahead in location look-up (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(validItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();

        const location = 'Annex';
        BulkEditActions.typeInTemporaryLocationFilter(location);
        BulkEditActions.verifyMatchingOptionsForLocationFilter(location);

        BulkEditActions.cancel();
      },
    );
  });
});
