import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    const holdingsCount = 2;
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePoint(),
      instance: {},
      locations: [],
      holdings: [],
      items: [],
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;

          [...Array(holdingsCount).keys()].forEach((index) => {
            const props = Locations.getDefaultLocation({
              servicePointId: testData.servicePoint.id,
            }).location;

            Locations.createViaApi(props).then((location) => {
              testData.locations.push(location);
              InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                (holdingSources) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.instance.instanceId,
                    permanentLocationId: location.id,
                    sourceId: holdingSources[0].id,
                  }).then((holding) => {
                    testData.holdings.push(holding);

                    InventoryItems.addItemToHoldingViaApi({
                      barcode: `0${index + 1}.${randomFourDigitNumber()}`,
                      holdingsRecordId: holding.id,
                    }).then((item) => {
                      testData.items.push(item);
                    });
                  });
                },
              );
            });
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiInventoryMoveItems.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.items.forEach((item) => InventoryItems.deleteItemViaApi(item.id));
      testData.holdings.forEach((holding) => {
        InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
      });
      testData.locations.forEach((location) => Locations.deleteViaApi(location));
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C15184 Move one item between holdings within an instance (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C15184'] },
      () => {
        // Find the instance from precondition
        InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);

        // Expand both "Holdings" accordions of opened "Instance" record.
        // There are two expanded "Holdings" records with one item associated to each.
        InventoryInstance.checkIsHoldingsCreated([
          `${testData.locations[0].name} >`,
          `${testData.locations[1].name} >`,
        ]);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.locations[0].name,
          records: [{ barcode: testData.items[0].barcode, status: 'Available' }],
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.locations[1].name,
          records: [{ barcode: testData.items[1].barcode, status: 'Available' }],
        });

        // Click "Actions" button, Select "Move items within an instance" option
        // * "Move to" button is displayed in each "Holdings" accordion.
        InventoryInstance.openMoveItemsWithinAnInstance();
        InventoryInstance.checkHoldingsTableContent({
          name: testData.locations[0].name,
          records: [{ barcode: testData.items[0].barcode, status: 'Available' }],
          columnIndex: 2,
          shouldOpen: false,
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.locations[1].name,
          records: [{ barcode: testData.items[1].barcode, status: 'Available' }],
          columnIndex: 2,
          shouldOpen: false,
        });

        // Drag and drop an Item from first "Holdings" to the second "Holdings
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.locations[0].name,
          toHolding: testData.locations[1].name,
          shouldOpen: false,
          itemMoved: true,
        });

        // Both items are now displaying under the second "Holdings"
        InventoryHoldings.checkIfExpanded(testData.locations[1].name, true);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.locations[1].name,
          records: [
            { barcode: testData.items[1].barcode, status: 'Available' },
            { barcode: testData.items[0].barcode, status: 'Available' },
          ],
          columnIndex: 2,
          shouldOpen: false,
        });
      },
    );
  });
});
