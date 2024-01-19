import permissions from '../../support/dictionary/permissions';
import InventoryInstancesMovement from '../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

let userId;
const item = {
  instanceName: `Inventory-first-${Number(new Date())}`,
  barcode: `a-${getRandomPostfix()}`,
  permanentLocationId: 'b241764c-1466-4e1d-a028-1a3684a5da87',
  name: 'Popular Reading Collection',
};

const secondItem = {
  instanceName: `Inventory-second-${getRandomPostfix()}`,
  barcode: `456${getRandomPostfix()}`,
  name: 'Online',
  permanentLocationId: '184aae84-a5bf-4c6a-85ba-4a7c73026cd5',
};

describe('inventory', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.uiInventoryMoveItems.gui,
      permissions.uiInventoryHoldingsMove.gui,
      permissions.inventoryViewCreateEditInstances.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });

      [item, secondItem].forEach((el) => {
        el.instanceId = InventoryInstances.createInstanceViaApi(
          el.instanceName,
          el.barcode,
        );
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
    { tags: ['criticalPath', 'firebird'] },
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
