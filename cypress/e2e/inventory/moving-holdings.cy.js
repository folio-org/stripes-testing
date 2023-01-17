import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import ItemView from '../../support/fragments/inventory/inventoryItem/itemView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';

const successCalloutMessage = '1 holding has been successfully moved.';
let userId;
const item = {
  instanceName: `Inventory-first-${Number(new Date())}`,
  barcode: `123${getRandomPostfix()}`,
};

const secondItem = {
  instanceName: `Inventory-second-${getRandomPostfix()}`,
  barcode: `123${getRandomPostfix()}`,
};

describe('inventory', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.uiInventoryMoveItems.gui,
      permissions.uiInventoryHoldingsMove.gui,
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, { path: TopMenu.inventoryPath, waiter: InventorySearchAndFilter.waitLoading })
          .then(() => {
            InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
            InventoryInstances.createInstanceViaApi(secondItem.instanceName, secondItem.barcode);
          });
      });
  });

  // after('delete test data', () => {
  //   InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
  //   InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.itemBarcode);
  //   Users.deleteViaApi(userId);
  // })

  it('C15187 Move some items with in a holdings record to another holdings associated with another instance', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    InventorySearchAndFilter.switchToItem();
    InventorySearchAndFilter.searchByParameter('Barcode', item.barcode)
    InventorySearchAndFilter.selectSearchResultItem();
    ItemView.dismissFromPaneHeader();

    InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(secondItem.instanceName);
    InteractorsTools.checkCalloutMessage(successCalloutMessage);
  });
})