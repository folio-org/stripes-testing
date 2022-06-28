import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../support/fragments/bulk-edit/bulk-edit-files';
import Users from '../../support/fragments/users/users';

let user;
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const resultFileName = `matchedRecords_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('bulk-edit: in-app file uploading', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.visit(TopMenu.bulkEditPath);

        // Create file with valid holdings UUIDs
        const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId}"` })
          .then(holdings => {
            FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, holdings[0].id);
          });
      });
  });

  after('Delete all data', () => {
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
    FileManager.deleteFile(`cypress/downloads/${resultFileName}`);
  });

  it('C357052 Verify Downloaded matched records if identifiers return more than one item', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');

    BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
    BulkEditSearchPane.waitFileUploading();
    BulkEditSearchPane.verifyMatchedResults('Available');

    BulkEditActions.downloadMatchedResults(resultFileName);
    BulkEditFiles.verifyMatchedResultFileContent(resultFileName, [item.itemBarcode]);
  });
});
