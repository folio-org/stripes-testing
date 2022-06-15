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
        cy.login(user.username, user.password);
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.visit(TopMenu.bulkEditPath);
        FileManager.createFile(`cypress/fixtures/${invalidItemBarcodesFileName}`, `${item.itemBarcode}\r\n${invalidBarcode}`);
        FileManager.createFile(`cypress/fixtures/${validItemBarcodesFileName}`, item.itemBarcode);
      });
  });

  after('Delete all data', () => {
    users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${validItemBarcodesFileName}`);
  });

  afterEach('open bulk edit page', () => {
    BulkEditActions.newBulkEdit();
  });

  it('C350905 Negative uploading file with identifiers -- In app approach', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    // try to upload empty file
    BulkEditSearchPane.uploadFile('empty.csv');
    InteractorsTools.checkCalloutMessage('Fail to upload file', calloutTypes.error);
    InteractorsTools.closeCalloutMessage();

    // try to upload another extension
    BulkEditSearchPane.uploadFile('example.json');
    BulkEditSearchPane.verifyModalName('Invalid file');

    // bug UIBULKED-88
    BulkEditSearchPane.uploadFile(['empty.csv', 'example.json']);
  });

  it('C353232 Verify error accordion during matching (In app approach)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
    BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);

    BulkEditSearchPane.verifyActionsAfterConductedInAppUploading();

    BulkEditSearchPane.verifyErrorLabel(invalidItemBarcodesFileName, 1, 1);
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
});
