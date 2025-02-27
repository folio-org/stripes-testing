import permissions from '../../../support/dictionary/permissions';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import { LOCATION_IDS } from '../../../support/constants';

let userId;
const item = {
  instanceName: `Inventory-first-${getRandomPostfix()}`,
  barcode: `123${getRandomPostfix()}`,
  firstHoldingName: 'Popular Reading Collection',
};

const secondItem = {
  instanceName: `Inventory-second-${getRandomPostfix()}`,
  barcode: `456${getRandomPostfix()}`,
};
const successCalloutMessage = '1 holding has been successfully moved.';

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.uiInventoryMoveItems.gui,
        permissions.uiInventoryHoldingsMove.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;
        item.instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        secondItem.instanceId = InventoryInstances.createInstanceViaApi(
          secondItem.instanceName,
          secondItem.barcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            permanentLocationId: LOCATION_IDS.POPULAR_READING_COLLECTION,
          });
        });
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${secondItem.instanceId}"`,
        }).then((holdings) => {
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            permanentLocationId: LOCATION_IDS.ANNEX,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.barcode);
      InventoryInstance.deleteInstanceViaApi(item.instanceId);
      Users.deleteViaApi(userId);
    });

    it(
      "C15186 Move one holdings with all it's associated items from one instance to another instance (firebird) (TaaS)",
      { tags: ['extendedPath', 'firebird', 'C15186'] },
      () => {
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.byKeywords(item.instanceName);
        InventorySearchAndFilter.selectSearchResultItem();

        InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
          item.firstHoldingName,
          secondItem.instanceName,
        );
        InteractorsTools.checkCalloutMessage(successCalloutMessage);
        InventoryInstancesMovement.verifyHoldingsMoved(item.firstHoldingName, '2');
      },
    );
  });
});
