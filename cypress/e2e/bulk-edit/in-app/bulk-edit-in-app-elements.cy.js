import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  itemIdentifiers,
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const invalidItemBarcodesFileName = `invalidItemBarcodes_${getRandomPostfix()}.csv`;
const validItemBarcodeFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const invalidBarcode = getRandomPostfix();

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.wait(3000);

        cy.login(user.username, user.password);
        cy.wait(10000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.waitLoading();

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
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
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
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C353232'] },
      () => {
        BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
        BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);

        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading();

        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
      },
    );

    it(
      'C350941 Verify uploading file with identifiers -- In app approach (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C350941'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
          'Items',
          ITEM_IDENTIFIERS.ITEM_BARCODES,
        );
        BulkEditSearchPane.uploadFile(validItemBarcodeFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
        BulkEditSearchPane.actionsIsShown();

        const expectedColumnTitles = [
          'Item effective location',
          'Effective call number',
          'Item HRID',
          'Barcode',
          'Material type',
          'Permanent loan type',
          'Temporary loan type',
          'Status',
        ];
        expectedColumnTitles.forEach((title) => BulkEditSearchPane.verifyResultColumnTitles(title));

        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditActions.verifyItemActionDropdownItems();

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Item UUID');
        BulkEditSearchPane.verifyResultColumnTitles('Item UUID');
      },
    );

    it(
      'C350943 Verify Record identifiers dropdown -- Inventory-Items app (firebird)',
      { tags: ['smoke', 'firebird', 'C350943'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.isItemsRadioChecked(true);
        BulkEditSearchPane.verifyRecordIdentifiers(itemIdentifiers);

        [
          {
            identifier: 'Item barcodes',
            label: 'Select a file with item barcodes.',
          },
          {
            identifier: 'Item UUIDs',
            label: 'Select a file with item UUIDs.',
          },
          {
            identifier: 'Item former identifiers',
            label: 'Select a file with item former identifiers.',
          },
          {
            identifier: 'Item accession numbers',
            label: 'Select a file with item accession numbers.',
          },
          {
            identifier: 'Holdings UUIDs',
            label: 'Select a file with holdings UUIDs.',
          },
        ].forEach((checker) => {
          BulkEditSearchPane.selectRecordIdentifier(checker.identifier);
          BulkEditSearchPane.verifyInputLabel(checker.label);
        });
      },
    );

    it(
      'C357035 Verify elements of the bulk edit app -- In app approach (firebird)',
      { tags: ['smoke', 'firebird', 'C357035'] },
      () => {
        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.verifyDefaultFilterState();

        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.clickToBulkEditMainButton();
        BulkEditSearchPane.verifyDefaultFilterState();
      },
    );
  });
});
