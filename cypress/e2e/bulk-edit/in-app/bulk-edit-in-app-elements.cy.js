import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';

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
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });

          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

          FileManager.createFile(`cypress/fixtures/${invalidItemBarcodesFileName}`, `${item.itemBarcode}\r\n${invalidBarcode}`);
          FileManager.createFile(`cypress/fixtures/${validItemBarcodeFileName}`, `${item.itemBarcode}`);
        });
    });

    beforeEach('select item tab', () => {
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${validItemBarcodeFileName}`);
    });

    afterEach('reload bulk-edit page', () => {
      cy.visit(TopMenu.bulkEditPath);
    });

    it('C404450 Verify error accordion during matching (In app approach) (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
      BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);

      BulkEditSearchPane.verifyActionsAfterConductedInAppUploading();

      BulkEditSearchPane.verifyErrorLabel(invalidItemBarcodesFileName, 1, 1);
    });

    it('C404460 Verify uploading file with identifiers -- In app approach (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.verifyDragNDropItemBarcodeArea();
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
      expectedColumnTitles.forEach(title => BulkEditSearchPane.verifyResultColumTitles(title));

      BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
      BulkEditSearchPane.verifyItemsActionDropdownItems();

      BulkEditSearchPane.changeShowColumnCheckbox('Item ID');
      BulkEditSearchPane.verifyResultColumTitles('Item ID');
    });

    it('C404391 Verify Record identifiers dropdown -- Inventory-Items app (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.verifyItemIdentifiers();

      [
        {
          identifier: 'Item barcode',
          label: 'Select a file with item barcode'
        },
        {
          identifier: 'Item UUIDs',
          label: 'Select a file with item UUIDs'
        },
        {
          identifier: 'Item former identifier',
          label: 'Select a file with item former identifier'
        },
        {
          identifier: 'Item accession number',
          label: 'Select a file with item accession number'
        },
        {
          identifier: 'Holdings UUIDs',
          label: 'Select a file with holdings UUIDs'
        },
      ].forEach(checker => {
        BulkEditSearchPane.selectRecordIdentifier(checker.identifier);
        BulkEditSearchPane.verifyInputLabel(checker.label);
      });
    });

    it('C404453 Verify elements of the bulk edit Items -- In app approach (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.clickToBulkEditMainButton();
      BulkEditSearchPane.verifyDefaultFilterState();

      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Item barcode');

      BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.clickToBulkEditMainButton();
      BulkEditSearchPane.verifyDefaultFilterState();
    });

    it('C404515 Verify "Inventory - holdings" option on "Bulk edit" app (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.verifyHoldingIdentifiers();

      [
        {
          identifier: 'Holdings UUIDs',
          label: 'Select a file with holdings UUIDs',
          pageText: 'Drag and drop or choose file with holdings UUIDs',
        },
        {
          identifier: 'Holdings HRIDs',
          label: 'Select a file with holdings HRIDs',
          pageText: 'Drag and drop or choose file with holdings HRIDs',
        },
        {
          identifier: 'Instance HRIDs',
          label: 'Select a file with instance HRIDs',
          pageText: 'Drag and drop or choose file with instance HRIDs',
        },
        {
          identifier: 'Item barcodes',
          label: 'Select a file with item barcode',
          pageText: 'Drag and drop or choose file with item barcode',
        },
      ].forEach(checker => {
        BulkEditSearchPane.selectRecordIdentifier(checker.identifier);
        BulkEditSearchPane.verifyInputLabel(checker.label);
        BulkEditSearchPane.verifyInputLabel(checker.pageText);
      });
    });
  });
});
