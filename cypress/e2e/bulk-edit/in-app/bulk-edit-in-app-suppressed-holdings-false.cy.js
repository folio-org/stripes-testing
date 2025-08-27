import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const holdingHRIDsFileName = `holdingHRIDs_${getRandomPostfix()}.csv`;
const barcode = getRandomPostfix();
const inventoryEntity = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode,
  secondBarcode: `secondBarcode_${barcode}`,
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        inventoryEntity.instanceId = InventoryInstances.createInstanceViaApi(
          inventoryEntity.instanceName,
          inventoryEntity.barcode,
        );
        cy.getHoldings({ query: `"instanceId"="${inventoryEntity.instanceId}"` }).then(
          (holdings) => {
            FileManager.createFile(`cypress/fixtures/${holdingHRIDsFileName}`, holdings[0].hrid);
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
              discoverySuppress: true,
            });
          },
        );

        cy.getItems({ query: `"barcode"=="${inventoryEntity.barcode}"` }).then((inventoryItem) => {
          inventoryItem.discoverySuppress = true;
          InventoryItems.editItemViaApi(inventoryItem);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(inventoryEntity.barcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingHRIDsFileName}`);
    });

    it(
      'C399061 Verify "Suppress from discovery" (Set false) option in Bulk Editing Holdings (firebird)',
      { tags: ['criticalPath', 'firebird', 'C399061'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        const suppressFromDiscovery = false;
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Suppress from discovery');
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 0, true);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();

        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Suppress from discovery',
          suppressFromDiscovery,
        );

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
        HoldingsRecordView.close();
        InventorySearchAndFilter.resetAll();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.resetAll();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.secondBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsAbsent();
      },
    );
  });
});
