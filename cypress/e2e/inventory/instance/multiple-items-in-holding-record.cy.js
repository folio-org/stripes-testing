import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { InventoryInstances } from '../../../support/fragments/inventory';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const holdingsCount = 2;
    const itemsCount = 2;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        holdingsCount,
        itemsCount,
      }),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      locations: [],
      user: {},
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(testData.servicePoint);

          [...Array(holdingsCount).keys()].forEach((index) => {
            const { location } = Locations.getDefaultLocation({
              servicePointId: testData.servicePoint.id,
            });
            testData.locations.push(location);
            testData.folioInstances[0].holdings[index].permanentLocationId = location.id;

            Locations.createViaApi(location);
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.folioInstances.forEach((instance) => {
          InventoryInstances.deleteInstanceViaApi({ instance });
        });
        testData.locations.forEach((location) => {
          Locations.deleteViaApi(location);
        });
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C196761 Instance record: holdings accordion display (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C196761'] },
      () => {
        // Click on instance from preconditions
        InventoryInstances.searchByTitle(testData.folioInstances[0].instanceTitle);
        InventoryInstances.selectInstance();

        testData.locations.forEach((location) => {
          // Number of associated Item records indicated by a number
          InventoryInstance.checkHoldingTitle({
            title: location.name,
            count: itemsCount,
          });

          // Open Holding accordion
          // The number of associated items should match the number
          InventoryInstance.checkHoldingsTableContent({
            name: location.name,
            records: [
              { status: ITEM_STATUS_NAMES.AVAILABLE, location: location.name },
              { status: ITEM_STATUS_NAMES.AVAILABLE, location: location.name },
            ],
          });
        });
      },
    );
  });
});
