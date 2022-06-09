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

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `C350905_itemBarcodes_${getRandomPostfix()}.csv`;
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
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, `${item.itemBarcode}\r\n${invalidBarcode}`);
      });
  });

  after('Delete all data', () => {
    users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
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

    BulkEditSearchPane.uploadFile(itemBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyMatchedResults([item.itemBarcode]);
    BulkEditSearchPane.verifyNonMatchedResults([invalidBarcode]);

    BulkEditSearchPane.verifyActionsAfterConductedInAppUploading();

    BulkEditSearchPane.verifyErrorLabel(itemBarcodesFileName, 1, 1);
  });
});
