import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { calloutTypes } from '../../../../interactors';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const invalidItemBarcodesFileName = `invalidItemBarcodes_${getRandomPostfix()}.csv`;
const validItemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const invalidBarcode = getRandomPostfix();

describe('bulk-edit', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

        FileManager.createFile(`cypress/fixtures/${invalidItemBarcodesFileName}`, `${item.itemBarcode}\r\n${invalidBarcode}`);
        FileManager.createFile(`cypress/fixtures/${validItemBarcodesFileName}`, item.itemBarcode);
      });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceViaApi(item.itemBarcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${invalidItemBarcodesFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${validItemBarcodesFileName}`);
  });

  it('C350905 Negative uploading file with identifiers -- In app approach (firebird)', { tags: [testTypes.smoke, devTeams.firebird, testTypes.broken] }, () => {
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

  // Bug UIBULKED-121
  it('C357030 Verify Matched records label cleanup -- In -app approach (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    BulkEditSearchPane.uploadFile(invalidItemBarcodesFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyMatchedResults(item.itemBarcode);
    BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);
    BulkEditSearchPane.verifyErrorLabel(invalidItemBarcodesFileName, 1, 1);
    BulkEditSearchPane.verifyPaneRecordsCount(1);

    BulkEditActions.openActions();
    BulkEditActions.openStartBulkEditForm();
    BulkEditActions.replaceTemporaryLocation();
    BulkEditActions.confirmChanges();
    BulkEditActions.saveAndClose();
    BulkEditSearchPane.waitFileUploading();

    BulkEditSearchPane.verifyNonMatchedResults(invalidBarcode);
    BulkEditSearchPane.verifyErrorLabelAfterChanges(invalidItemBarcodesFileName, 1, 1);
    BulkEditActions.verifySuccessBanner();
  });
});
