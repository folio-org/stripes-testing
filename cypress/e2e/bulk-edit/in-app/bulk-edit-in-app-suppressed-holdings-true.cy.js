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

let user;
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
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

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({ query: `"instanceId"="${instanceId}"` }).then((holdings) => {
          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
    });

    it(
      'C398010 Verify "Suppress from discovery" (Set true) option in Bulk Editing Holdings (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        const suppressFromDiscovery = true;
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

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();
      },
    );
  });
});
