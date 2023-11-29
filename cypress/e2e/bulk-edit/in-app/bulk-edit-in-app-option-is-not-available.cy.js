import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import DevTeams from '../../../support/dictionary/devTeams';
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

const invalidHoldingUUIDsFileName = `InvalidHoldingUUIDs_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${invalidHoldingUUIDsFileName}`);
    });

    it(
      'C360115 Verify that "Start bulk edit" option is not available after uploading the  file with invalid Holdings UUIDs (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();

        BulkEditSearchPane.uploadFile(invalidHoldingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(invalidHoldingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyErrorLabel(invalidHoldingUUIDsFileName, 0, 1);
        BulkEditSearchPane.verifyPaneRecordsCount(0);
        BulkEditSearchPane.verifyNonMatchedResults();
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsAbsent();
        BulkEditActions.downloadErrorsExists();
        BulkEditActions.startBulkEditAbsent();
        BulkEditSearchPane.verifyAllCheckboxesInShowColumnMenuAreDisabled();
      },
    );
  });
});
