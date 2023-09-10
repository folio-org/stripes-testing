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
const validHoldingHRIDsFileName = `validHoldingHRIDs_${getRandomPostfix()}.csv`;
const inventoryEntity = {
  instanceName: `testBulkEditWithSpecial:;Chars_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  holdingHRID: '',
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        const instanceId = InventoryInstances.createInstanceViaApi(
          inventoryEntity.instanceName,
          inventoryEntity.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId}"`,
        }).then((holdings) => {
          inventoryEntity.holdingHRID = holdings[0].hrid;
          FileManager.createFile(
            `cypress/fixtures/${validHoldingHRIDsFileName}`,
            inventoryEntity.holdingHRID,
          );
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        inventoryEntity.itemBarcode,
      );
      FileManager.deleteFile(`cypress/fixtures/${validHoldingHRIDsFileName}`);
    });

    it(
      'C366548 Verify that Holdings with special characters in title can be bulk edited (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

        BulkEditSearchPane.uploadFile(validHoldingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(inventoryEntity.holdingHRID);

        const tempLocation = 'Annex';

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(tempLocation, 'holdings', 0);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyChangedResults(tempLocation);
        BulkEditActions.verifySuccessBanner(1);
      },
    );
  });
});
