import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InteractorsTools from '../../support/utils/interactorsTools';
import { calloutTypes } from '../../../interactors';
import devTeams from '../../support/dictionary/devTeams';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import FileManager from '../../support/utils/fileManager';
import users from '../../support/fragments/users/users';
import BulkEditActions from '../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemToBeDeleted = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const invalidItemBarcodesFileName = `C350905_invalidItemBarcodes_${getRandomPostfix()}.csv`;
const validItemBarcodesFileName = `C350905_validItemBarcodes_${getRandomPostfix()}.csv`;
const invalidBarcode = getRandomPostfix();

describe('bulk-edit: in-app file uploading', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        InventoryInstances.createInstanceViaApi(itemToBeDeleted.instanceName, itemToBeDeleted.itemBarcode);

        FileManager.createFile(`cypress/fixtures/${invalidItemBarcodesFileName}`, `${item.itemBarcode}\r\n${invalidBarcode}\r\n${itemToBeDeleted.itemBarcode}`);
        FileManager.createFile(`cypress/fixtures/${validItemBarcodesFileName}`, item.itemBarcode);
      });
  });

  after('Delete all data', () => {
    users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${validItemBarcodesFileName}`);
  });

  it('C350905 Negative uploading file with identifiers -- In app approach', { tags: [testTypes.smoke, devTeams.firebird, testTypes.broken] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    // try to upload empty file
    BulkEditSearchPane.uploadFile('empty.csv');
    InteractorsTools.checkCalloutMessage('Fail to upload file', calloutTypes.error);
    InteractorsTools.closeCalloutMessage();

    const invalidFileWarning = 'Invalid file';
    // try to upload another extension
    BulkEditSearchPane.uploadFile('example.json');
    BulkEditSearchPane.verifyModalName(invalidFileWarning);

    BulkEditSearchPane.uploadFile(['empty.csv', 'example.json']);
    BulkEditSearchPane.verifyModalName(invalidFileWarning);
  });

  it('C353232 Verify error accordion during matching (In app approach)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
    BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);

    BulkEditSearchPane.verifyActionsAfterConductedInAppUploading();

    BulkEditSearchPane.verifyErrorLabel(invalidItemBarcodesFileName, 2, 1);
    BulkEditActions.newBulkEdit();
  });

  it('C350941 Verify uploading file with identifiers -- In app approach', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    BulkEditSearchPane.uploadFile(validItemBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    const expectedColumnTitles = [
      'Barcode',
      'Status',
      'Item effective location',
      'Effective call number',
      'Item HRID',
      'Material type',
      'Permanent loan type',
      'Temporary loan type'
    ];
    expectedColumnTitles.forEach(title => BulkEditSearchPane.verifyResultColumTitles(title));

    BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
    BulkEditSearchPane.verifyItemsActionDropdownItems();

    BulkEditSearchPane.changeShowColumnCheckbox('Item UUID');
    BulkEditSearchPane.verifyResultColumTitles('Item UUID');
    BulkEditActions.newBulkEdit();
  });

  it('C350943 Verify Record identifiers dropdown -- Inventory-Items app', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.verifyItemIdentifiers();

    [
      { identifier: 'Item barcode', label: 'Select a file with item barcode' },
      { identifier: 'Item UUIDs', label: 'Select a file with item UUIDs' },
      { identifier: 'Item former identifier', label: 'Select a file with item former identifier' },
      { identifier: 'Item accession number', label: 'Select a file with item accession number' },
      { identifier: 'Holdings UUIDs', label: 'Select a file with holdings UUIDs' },
    ].forEach(checker => {
      BulkEditSearchPane.selectRecordIdentifier(checker.identifier);
      BulkEditSearchPane.verifyInputLabel(checker.label);
    });
  });

  it('C357053 Negative: Verify enable type ahead in location look-up', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    BulkEditSearchPane.uploadFile(validItemBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditActions.openActions();
    BulkEditActions.openStartBulkEditForm();
    BulkEditActions.fillTemporaryLocationFilter(`test_location_${getRandomPostfix()}`);
    BulkEditActions.verifyNoMatchingOptionsForLocationFilter();
    BulkEditActions.cancel();
    BulkEditActions.newBulkEdit();
  });

  it('C357035 Verify elements of the bulk edit app -- In app approach', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    BulkEditSearchPane.clickToBulkEditMainButton();
    BulkEditSearchPane.verifyDefaultFilterState();

    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.clickToBulkEditMainButton();
    BulkEditSearchPane.verifyDefaultFilterState();
  });

  // Bug UIBULKED-121
  it('C353230 Verify completion of the in-app bulk edit', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditActions.openActions();
    BulkEditActions.openStartBulkEditForm();
    BulkEditActions.replaceTemporaryLocation();
    BulkEditActions.confirmChanges();

    InventoryInstances.deleteInstanceViaApi(itemToBeDeleted.itemBarcode);

    BulkEditActions.saveAndClose();
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);
    BulkEditActions.verifyActionAfterChangingRecords();
    BulkEditSearchPane.verifyErrorLabel(invalidItemBarcodesFileName, 1, 1);
    BulkEditActions.verifySuccessBanner();
    BulkEditActions.newBulkEdit();
  });
});
