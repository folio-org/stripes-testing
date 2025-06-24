import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

const invalidHoldingUUIDsFileName = `InvalidHoldingUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          item.holdingUUID = holdings[0].hrid;
          FileManager.createFile(
            `cypress/fixtures/${invalidHoldingUUIDsFileName}`,
            item.holdingUUID,
          );
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${invalidHoldingUUIDsFileName}`);
    });

    it(
      'C360115 Verify that "Start bulk edit" option is not available after uploading the  file with invalid Holdings UUIDs (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C360115'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

        BulkEditSearchPane.uploadFile(invalidHoldingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(invalidHoldingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyPaneRecordsCount('0 holdings');
        BulkEditSearchPane.verifyNonMatchedResults(item.holdingUUID);
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsAbsent();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.startBulkEditAbsent();
        BulkEditSearchPane.verifyAllCheckboxesInShowColumnMenuAreDisabled();
      },
    );
  });
});
