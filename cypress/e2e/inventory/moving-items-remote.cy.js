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
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';

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
        });

      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C163927 Move an item with remote effective location from remote storage locations to non-remote storage holding (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
      InventorySearchAndFilter.selectSearchResultItem();
      ItemRecordView.closeDetailView();
      InventoryInstance.openMoveItemsWithinAnInstance();

      InventoryInstance.moveItemToAnotherHolding(item.firstLocationName, item.secondLocationName);
      InventoryInstance.confirmOrCancel('Continue');
      InteractorsTools.checkCalloutMessage(successCalloutMessage);
      InventoryInstancesMovement.verifyHoldingsMoved(item.secondLocationName, '1');

      InventoryInstance.moveItemToAnotherHolding(item.firstLocationName, item.secondLocationName);
      InventoryInstance.confirmOrCancel('Cancel');
    },
  );
});
