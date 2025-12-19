import InventoryInstances, {
  searchHoldingsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C9207_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 3,
        instanceTitlePrefix,
        holdingsCount: 1,
        itemsCount: 0,
      }),
      searchOption: searchHoldingsOptions[7], // Holdings HRID
    };
    testData.folioInstances.forEach((instance, index) => {
      instance.instanceTitle = `${instanceTitlePrefix}_${index + 1}`;
    });

    let user;
    let location;
    const holdingsHRIDs = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C9207_FolioInstance');

      cy.then(() => {
        // Get required reference data
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
        }).then((res) => {
          location = res;
        });
      }).then(() => {
        // Create 3 instances with 1 holdings each
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });

        // Get Holdings HRIDs for search tests
        testData.folioInstances.forEach((instance, index) => {
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${instance.instanceId}"`,
          }).then((holdings) => {
            holdingsHRIDs[index] = holdings[0].hrid;
          });
        });
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.folioInstances.forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C9207 Verify search on Holdings HRID (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C9207'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
        InventoryInstances.waitContentLoading();

        // Step 1: Open the Inventory app. Select the holdings segment.
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();

        // Step 2: Click on the search options dropdown and select "Holdings HRID" search option
        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

        // Step 3: Search for first holdings HRID
        InventorySearchAndFilter.executeSearch(holdingsHRIDs[0]);
        InventorySearchAndFilter.verifySearchResult(testData.folioInstances[0].instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);

        // Step 4: Repeat test with second Holdings HRID
        InventorySearchAndFilter.executeSearch(holdingsHRIDs[1]);
        InventorySearchAndFilter.verifySearchResult(testData.folioInstances[1].instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);

        // Repeat test with third Holdings HRID
        InventorySearchAndFilter.executeSearch(holdingsHRIDs[2]);
        InventorySearchAndFilter.verifySearchResult(testData.folioInstances[2].instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
