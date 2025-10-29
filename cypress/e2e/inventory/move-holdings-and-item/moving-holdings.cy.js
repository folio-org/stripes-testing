import permissions from '../../../support/dictionary/permissions';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { LOCATION_IDS } from '../../../support/constants';

let userId;
const item = {
  instanceName: `Inventory-first-${Number(new Date())}`,
  barcode: `a-${getRandomPostfix()}`,
  permanentLocationId: LOCATION_IDS.POPULAR_READING_COLLECTION,
  name: 'Popular Reading Collection',
};

const secondItem = {
  instanceName: `Inventory-second-${getRandomPostfix()}`,
  barcode: `456${getRandomPostfix()}`,
  name: 'Online',
  permanentLocationId: LOCATION_IDS.ONLINE,
};

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.uiInventoryMoveItems.gui,
        permissions.uiInventoryHoldingsMove.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        [item, secondItem].forEach((el) => {
          el.instanceId = InventoryInstances.createInstanceViaApi(el.instanceName, el.barcode);
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${el.instanceId}"`,
          }).then((holdings) => {
            cy.updateHoldingRecord(holdings[0].id, {
              ...holdings[0],
              permanentLocationId: el.permanentLocationId,
            });
          });
        });

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.barcode);
      Users.deleteViaApi(userId);
    });

    it(
      'C15187 Move some items with in a holdings record to another holdings associated with another instance (firebird)',
      { tags: ['criticalPath', 'firebird', 'C15187'] },
      () => {
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        InventorySearchAndFilter.selectSearchResultItem();
        ItemRecordView.closeDetailView();

        InventoryInstance.moveItemToAnotherInstance({
          fromHolding: item.name,
          toInstance: secondItem.instanceName,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(secondItem.name, '3');

        InventoryInstance.moveItemBackToInstance(secondItem.name, item.instanceName);
        InventoryInstancesMovement.verifyHoldingsMoved(item.name, '2');
      },
    );
  });
});
