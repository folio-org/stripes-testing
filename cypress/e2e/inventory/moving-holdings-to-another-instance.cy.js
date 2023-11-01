import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstancesMovement from '../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';

let userId;
const item = {
  instanceName: `Inventory-first-${getRandomPostfix()}`,
  barcode: `123${getRandomPostfix()}`,
  firstHoldingName: 'Popular Reading Collection'
};

const secondItem = {
  instanceName: `Inventory-second-${getRandomPostfix()}`,
  barcode: `456${getRandomPostfix()}`,
  firstHoldingName: 'Annex'
};
const successCalloutMessage = '1 holding has been successfully moved.';

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
      item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
      secondItem.instanceId = InventoryInstances.createInstanceViaApi(secondItem.instanceName, secondItem.barcode);

      cy.getHoldings({ limit: 1, query: `"instanceId"="${item.instanceId}"` }).then((holdings) => {
        cy.updateHoldingRecord(holdings[0].id, {
          ...holdings[0],
          // Popular Reading Collection
          permanentLocationId: 'b241764c-1466-4e1d-a028-1a3684a5da87',
        });
      });
      cy.getHoldings({ limit: 1, query: `"instanceId"="${secondItem.instanceId}"` }).then((holdings) => {
        cy.updateHoldingRecord(holdings[0].id, {
          ...holdings[0],
          // Annex
          permanentLocationId: '53cf956f-c1df-410b-8bea-27f712cca7c0',
        });
      });
    });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.barcode);
    InventoryInstance.deleteInstanceViaApi(item.instanceId);
    Users.deleteViaApi(userId);
  });

  it(
    "C15186 Move one holdings with all it's associated items from one instance to another instance (firebird) (TaaS)",
    { tags: [testTypes.extendedPath, devTeams.firebird] },
    () => {
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
      InventorySearchAndFilter.selectSearchResultItem();
      ItemRecordView.closeDetailView();

      InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
        item.firstHoldingName,
        secondItem.instanceName,
      );
      InteractorsTools.checkCalloutMessage(successCalloutMessage);
      InventoryInstancesMovement.verifyHoldingsMoved(item.firstHoldingName, '2');
    },
  );
});
