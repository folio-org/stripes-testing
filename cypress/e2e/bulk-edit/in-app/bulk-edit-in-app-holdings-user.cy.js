import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';

let user;
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });

          const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${instanceId}"`
          })
            .then(holdings => {
              FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, holdings[0].id);
            });
        });

      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    });

    it('C404517 Verify that User can upload file with Holdings UUIDs (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
      BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      [
        'Holdings HRID',
        'Holdings type',
        'Permanent location',
        'Temporary location',
        'Call number prefix',
        'Call number',
        'Call number suffix',
      ].forEach(title => {
        BulkEditSearchPane.verifyResultColumTitles(title);
      });
      BulkEditActions.openActions();
      BulkEditSearchPane.verifyHoldingActionShowColumns();

      BulkEditSearchPane.changeShowColumnCheckbox('Permanent location');
      BulkEditSearchPane.verifyResultColumTitlesDoNotInclude('Permanent location');

      BulkEditSearchPane.changeShowColumnCheckbox('Call number type');
      BulkEditSearchPane.verifyResultColumTitles('Call number type');
    });
  });
});
