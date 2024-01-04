import permissions from '../../support/dictionary/permissions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstancesMovement from '../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

let userId;
const item = {
  instanceName: `Inventory-first-${Number(new Date())}`,
  barcode: `123${getRandomPostfix()}`,
  firstHoldingName: '',
  holdings: [],
};

const secondItem = {
  instanceName: `Inventory-second-${getRandomPostfix()}`,
  barcode: `456${getRandomPostfix()}`,
};
const successCalloutMessage = '1 holding has been successfully moved.';

describe('inventory', () => {
  before('create test data', () => {
    let holdingSources;
    cy.createTempUser([
      permissions.uiInventoryMoveItems.gui,
      permissions.uiInventoryHoldingsMove.gui,
      permissions.inventoryViewCreateEditInstances.gui,
    ]).then((userProperties) => {
      cy.getLocations({ limit: 3 });
      cy.getHoldingTypes({ limit: 3 });
      InventoryHoldings.getHoldingSources({ limit: 2 }).then((holdingsSourcesResponse) => {
        holdingSources = holdingsSourcesResponse;
      });
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      }).then(() => {
        item.holdings = [
          {
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
            sourceId: holdingSources[0].id,
          },
          {
            holdingsTypeId: Cypress.env('holdingsTypes')[1].id,
            permanentLocationId: Cypress.env('locations')[1].id,
            sourceId: holdingSources[1].id,
          },
        ];
        secondItem.holdings = [
          {
            holdingsTypeId: Cypress.env('holdingsTypes')[2].id,
            permanentLocationId: Cypress.env('locations')[2].id,
            sourceId: holdingSources[0].id,
          },
        ];
        InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.barcode,
          null,
          '1',
          '2',
          'test_number_1',
          item.holdings,
        );
        InventoryInstances.createInstanceViaApi(
          secondItem.instanceName,
          secondItem.barcode,
          null,
          '1',
          '2',
          'test_number_1',
          secondItem.holdings,
        );

        cy.getItems({ query: `"barcode"=="${item.barcode}"` }).then((response) => {
          item.firstHoldingName = response.effectiveLocation.name;
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

      InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
        item.firstHoldingName,
        secondItem.instanceName,
      );
      InteractorsTools.checkCalloutMessage(successCalloutMessage);
      InventoryInstancesMovement.verifyHoldingsMoved(item.firstHoldingName, '2');

      InventoryInstancesMovement.moveFromMultiple(item.firstHoldingName, item.instanceName);
      InteractorsTools.checkCalloutMessage(successCalloutMessage);
      InventoryInstancesMovement.verifyHoldingsMoved(item.firstHoldingName, '2');
    },
  );
});
