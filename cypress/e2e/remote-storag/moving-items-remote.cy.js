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
import { LOCATION_IDS } from '../../support/constants';

let user;
const item = {
  instanceName: `instanceName-${getRandomPostfix()}`,
  barcode: `barcode-${getRandomPostfix()}`,
  // Remote location
  firstLocationId: LOCATION_IDS.ANNEX,
  firstLocationName: 'Annex',
  // Non-remote location
  secondLocationId: LOCATION_IDS.POPULAR_READING_COLLECTION,
  secondLocationName: 'Popular Reading Collection',
};
const successCalloutMessage =
  'Item has been successfully moved in FOLIO. To complete removing this item from remote storage, run an exception report or communicate this directly to your remote storage location.';

describe('Remote Storage', () => {
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
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C163927 Move an item with remote effective location from remote storage locations to non-remote storage holding (volaris)',
    { tags: ['criticalPath', 'volaris', 'C163927'] },
    () => {
      cy.waitForAuthRefresh(() => {}, 20_000);
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
      cy.waitForAuthRefresh(() => {}, 20_000);
      InventorySearchAndFilter.selectSearchResultItem();
      ItemRecordView.closeDetailView();
      InventoryInstance.openMoveItemsWithinAnInstance();

      InventoryInstance.moveItemToAnotherHolding({
        fromHolding: item.firstLocationName,
        toHolding: item.secondLocationName,
      });
      InventoryInstance.confirmOrCancel('Continue');
      InteractorsTools.checkCalloutMessage(successCalloutMessage);
      InventoryHoldings.checkIfExpanded(item.secondLocationName, false);
      InventoryInstancesMovement.verifyHoldingsMoved(item.secondLocationName, '1');

      InventoryHoldings.checkIfExpanded(item.firstLocationName, false);
      InventoryInstance.moveItemToAnotherHolding({
        fromHolding: item.firstLocationName,
        toHolding: item.secondLocationName,
      });
      InventoryInstance.confirmOrCancel('Cancel');
    },
  );
});
