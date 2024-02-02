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
const invalidItemBarcodesFileName = `invalidItemBarcodes_${getRandomPostfix()}.csv`;
const validItemBarcodeFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const invalidBarcode = getRandomPostfix();

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${invalidItemBarcodesFileName}`,
          `${item.itemBarcode}\r\n${invalidBarcode}`,
        );
        FileManager.createFile(
          `cypress/fixtures/${validItemBarcodeFileName}`,
          `${item.itemBarcode}`,
        );
      });
    });

    beforeEach('select item tab', () => {
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validItemBarcodeFileName}`);
    });

    it(
      'C353232 Verify error accordion during matching (In app approach) (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
        BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);

        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading();

        BulkEditSearchPane.verifyErrorLabel(invalidItemBarcodesFileName, 1, 1);
      },
    );

    it(
      'C350941 Verify uploading file with identifiers -- In app approach (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcode');
        BulkEditSearchPane.uploadFile(validItemBarcodeFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
        BulkEditSearchPane.actionsIsShown();

        const expectedColumnTitles = [
          'Item HRID',
          'Barcode',
          'Effective call number',
          'Status',
          'Material type',
          'Permanent loan type',
          'Temporary loan type',
          'Item effective location',
        ];
        expectedColumnTitles.forEach((title) => BulkEditSearchPane.verifyResultColumTitles(title));

        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditActions.verifyItemActionDropdownItems();

        BulkEditSearchPane.changeShowColumnCheckbox('Item ID');
        BulkEditSearchPane.verifyResultColumTitles('Item ID');
      },
    );

    it(
      'C350943 Verify Record identifiers dropdown -- Inventory-Items app (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Items');

        [
          {
            identifier: 'Item barcode',
            label: 'Select a file with item barcode',
          },
          {
            identifier: 'Item UUIDs',
            label: 'Select a file with item UUIDs',
          },
          {
            identifier: 'Item former identifier',
            label: 'Select a file with item former identifier',
          },
          {
            identifier: 'Item accession number',
            label: 'Select a file with item accession number',
          },
          {
            identifier: 'Holdings UUIDs',
            label: 'Select a file with holdings UUIDs',
          },
        ].forEach((checker) => {
          BulkEditSearchPane.selectRecordIdentifier(checker.identifier);
          BulkEditSearchPane.verifyInputLabel(checker.label);
        });
      },
    );

    it(
      'C357035 Verify elements of the bulk edit app -- In app approach (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.verifyDefaultFilterState();

        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.verifyDefaultFilterState();
      },
    );
  });
});
