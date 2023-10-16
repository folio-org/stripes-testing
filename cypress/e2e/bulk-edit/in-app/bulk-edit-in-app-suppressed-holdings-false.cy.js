import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemActions from '../../../support/fragments/inventory/inventoryItem/itemActions';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const holdingHRIDsFileName = `holdingHRIDs_${getRandomPostfix()}.csv`;
const barcode = getRandomPostfix();
const inventoryEntity = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode,
  secondBarcode: `secondBarcode_${barcode}`,
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

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
          ItemActions.editItemViaApi(inventoryItem);
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(inventoryEntity.barcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingHRIDsFileName}`);
    });

    it(
      'C399061 Verify "Suppress from discovery" (Set false) option in Bulk Editing Holdings (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        const suppressFromDiscovery = false;
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox('Suppress from discovery');
        BulkEditActions.openInAppStartBulkEditFrom();
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

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();

        TopMenuNavigation.navigateToApp('Inventory');
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', inventoryEntity.secondBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsAbsent();
      },
    );
  });
});
