import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const holdingsHRIDFileName = `holdingsHRIDFileName${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then((holdings) => {
          item.holdingsHRID = holdings[0].hrid;
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            electronicAccess: [{
              // Resource
              relationshipId: 'f5d0068e-6272-458e-8a81-b85e7b9a14aa',
              uri: '',
              linkText: '',
              materialsSpecification: '',
              publicNote: '',
            }]
          });
          FileManager.createFile(`cypress/fixtures/${holdingsHRIDFileName}`, item.holdingsHRID);
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingsHRIDFileName}`);
    });

    it(
      'C409429 Verify Bulk Edit for Holdings without populated "URI" in electronic access (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.uploadFile(holdingsHRIDFileName);
        BulkEditSearchPane.waitFileUploading();

        const location = 'Online';
        const supress = true;
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Suppress from discovery');
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.editSuppressFromDiscovery(supress, 0, true);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replaceTemporaryLocation(location, 'holdings', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replacePermanentLocation(location, 'holdings', 2);
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
        InventoryInstance.verifyHoldingsPermanentLocation(location);
        InventoryInstance.verifyHoldingsTemporaryLocation(location);
      }
    );
  });
});
