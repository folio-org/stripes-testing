import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('inventory', () => {
  describe('Call Number Browse', () => {
    const firstCallNumber = 'QS 11 .GA1 E99 2005';
    const secondCallNumber = 'D15.H63 A3 2002';
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 2,
        callNumbers: [firstCallNumber, secondCallNumber],
      }),
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);

        testData.location = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;

        Locations.createViaApi(testData.location).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
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
      cy.getAdminToken();
      testData.folioInstances.forEach(({ instanceId }) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C407697 Browse for Call number without specified call number type, which match with any call number type format (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        // Click on the "Select a browse option" dropdown and select "Call numbers (all)" browse option.
        InventorySearchAndFilter.selectBrowseCallNumbers();

        // Fill in the search box with call number #1, Click on the "Search" button
        InventorySearchAndFilter.browseSearch(firstCallNumber);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: firstCallNumber }],
        });

        // Fill in the search box with call number #2, Click on the "Search" button
        InventorySearchAndFilter.browseSearch(secondCallNumber);
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: secondCallNumber }],
        });
      },
    );
  });
});
