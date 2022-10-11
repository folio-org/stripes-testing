import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import Users from '../../../support/fragments/users/users';

let user;
const itemBarcode = getRandomPostfix();
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const resultFileName = `matchedRecords_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode1: itemBarcode,
  itemBarcode2: `secondBarcode_${itemBarcode}`
};

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

          // Create file with valid holdings UUIDs
          const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode1);
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${instanceId}"`
          })
            .then(holdings => {
              FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, holdings[0].id);
            });
        });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode1);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
      FileManager.deleteFile(`cypress/downloads/${resultFileName}`);
    });

    afterEach('open new bulk edit', () => {
      BulkEditActions.newBulkEdit();
    });

    it('C357052 Verify Downloaded matched records if identifiers return more than one item (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');

      BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyMatchedResults(item.itemBarcode1, item.itemBarcode2);

      BulkEditActions.downloadMatchedResults(resultFileName);
      BulkEditFiles.verifyMatchedResultFileContent(resultFileName, [item.itemBarcode1, item.itemBarcode2]);
    });

    it('C356810 Verify uploading file with holdings UUIDs (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');

      BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      BulkEditSearchPane.verifyMatchedResults(item.itemBarcode1, item.itemBarcode2);

      BulkEditActions.openActions();
      BulkEditActions.openStartBulkEditForm();
      BulkEditActions.replaceTemporaryLocation();
      BulkEditActions.confirmChanges();
      BulkEditActions.commitChanges();
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyChangedResults(item.itemBarcode1, item.itemBarcode2);
      BulkEditActions.verifySuccessBanner(2);
    });
  });
});
