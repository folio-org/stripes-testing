import permissions from '../../support/dictionary/permissions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstancesMovement from '../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const item = {
  instanceName: `instanceName-${getRandomPostfix()}`,
  barcode: `barcode-${getRandomPostfix()}`,
  // Remote location
  firstLocationId: '53cf956f-c1df-410b-8bea-27f712cca7c0',
  firstLocationName: 'Annex',
  // Non-remote location
  secondLocationId: 'b241764c-1466-4e1d-a028-1a3684a5da87',
  secondLocationName: 'Popular Reading Collection',
};
const successCalloutMessage =
  'Item has been successfully moved in FOLIO. To complete removing this item from remote storage, run an exception report or communicate this directly to your remote storage location.';

describe('inventory', () => {
  before('create test data', () => {
    let holdingSources;
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.uiInventoryMoveItems.gui,
      permissions.remoteStorageCRUD.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.getLocations({ limit: 2 });
      cy.getHoldingTypes({ limit: 2 });
      InventoryHoldings.getHoldingSources({ limit: 2 })
        .then((holdingsSourcesResponse) => {
          holdingSources = holdingsSourcesResponse;
        })
        .then(() => {
          item.holdings = [
            {
              holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
              permanentLocationId: item.firstLocationId,
              sourceId: holdingSources[0].id,
            },
            {
              holdingsTypeId: Cypress.env('holdingsTypes')[1].id,
              permanentLocationId: item.secondLocationId,
              sourceId: holdingSources[1].id,
            },
          ];
          item.instanceId = InventoryInstances.createInstanceViaApi(
            item.instanceName,
            item.barcode,
            null,
            '1',
            '2',
            'test_number_1',
            item.holdings,
          );
        })
        .then(() => {
          // Update item with non-remote effective location
          cy.getItems({ query: `"barcode"=="${item.barcode}"` }).then((res) => {
            const itemData = res;
            itemData.effectiveLocation.id = item.secondLocationId;
            itemData.effectiveLocation.name = item.secondLocationName;
            InventoryItems.editItemViaApi(itemData);
          });
        })
        .then(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
          });
        });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C191169 Move item with non remote effective location to a non remote holding (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
      InventorySearchAndFilter.selectSearchResultItem();
      ItemRecordView.closeDetailView();
      InventoryInstance.openMoveItemsWithinAnInstance();

      InventoryInstance.moveItemToAnotherHolding({
        fromHolding: item.firstLocationName,
        toHolding: item.secondLocationName,
      });
      InventoryInstance.confirmOrCancel('Continue');
      InteractorsTools.checkCalloutMessage(successCalloutMessage);
      InventoryInstance.openHoldings([item.secondLocationName]);
      InventoryInstancesMovement.verifyHoldingsMoved(item.secondLocationName, '1');

      InventoryInstance.openHoldings([item.firstLocationName]);
      InventoryInstance.moveItemToAnotherHolding({
        fromHolding: item.firstLocationName,
        toHolding: item.secondLocationName,
      });
      InventoryInstance.confirmOrCancel('Cancel');
    },
  );
});
