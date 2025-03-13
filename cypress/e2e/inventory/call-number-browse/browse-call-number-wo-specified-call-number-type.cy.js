import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const rnd = getRandomPostfix();
    const holdingCallNubmers = ['QS 11 .GA1 E99 2005', 'D15.H63 A3 2002'];

    const testData = {
      folioInstances: holdingCallNubmers
        .map((callNumber, idx) => {
          return InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `AT_C407697 Folio Instance ${idx + 1} ${rnd}`,
            holdings: [{ callNumber }],
          });
        })
        .flat(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407697');
          testData.servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi(testData.defaultLocation);
        })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location: testData.defaultLocation,
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C407697');
      Locations.deleteViaApi(testData.defaultLocation);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C407697 Browse for Call number without specified call number type, which match with any call number type format (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C407697', 'eurekaPhase1'] },
      () => {
        // Click on the "Select a browse option" dropdown and select "Call numbers (all)" browse option.
        InventorySearchAndFilter.selectBrowseCallNumbers();

        holdingCallNubmers.forEach((callNumber) => {
          // Fill in the search box with call number, Click on the "Search" button
          BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          InventorySearchAndFilter.browseSearch(callNumber);
          InventorySearchAndFilter.verifyBrowseInventorySearchResults({
            records: [{ callNumber }],
          });
        });
      },
    );
  });
});
