import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

const testData = {};
const validHoldingUUIDsFileName = `SearchHoldingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditUpdateRecords.gui,
        Permissions.inventoryAll.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          item.holdingUUID = holdings[0].id;
          item.holdingHRID = holdings[0].hrid;
          FileManager.createFile(`cypress/fixtures/${validHoldingUUIDsFileName}`, item.holdingUUID);
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
    });

    it(
      'C374151 Verify Bulk edit state when navigating to another app and back-Holdings (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();

        BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
        BulkEditSearchPane.checkForUploading(validHoldingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter('Holdings UUID', item.holdingUUID);
        InventorySearchAndFilter.verifyInstanceDisplayed(item.instanceName);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
        cy.reload();
        BulkEditSearchPane.verifyMatchedResults(item.holdingHRID);
      },
    );
  });
});
