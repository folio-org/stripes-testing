import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const admNote1 = 'Original, restore this Item 07-15-2022';
    const admNote2 = 'Original, replace this Item 07-16-2022';
    const testData = {
      firstInstance: InventoryInstances.generateFolioInstances({
        count: 1,
        itemsProperties: { administrativeNotes: [admNote1] },
      })[0],
      secondInstance: InventoryInstances.generateFolioInstances({
        count: 1,
        itemsProperties: { administrativeNotes: [admNote2] },
      })[0],
    };
    const queryForNote1 = `item.administrativeNotes ==/ string "${admNote1}"`;
    const queryForNote2 = `item.administrativeNotes ==/ string "${admNote2}"`;
    // Order matches TestRail steps 2-9, which already alternate results/no-results.
    const queries = [
      { query: 'item.administrativeNotes = "original Item"', hasResults: true },
      { query: 'item.administrativeNotes == "original Item"', hasResults: false },
      { query: 'item.administrativeNotes == "this Item"', hasResults: true },
      { query: 'item.administrativeNotes ==/ string "this Item"', hasResults: false },
    ];
    let firstItemData;
    let secondItemData;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: [testData.firstInstance],
          location,
        });
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: [testData.secondInstance],
          location,
        });
      });
      firstItemData = testData.firstInstance;
      secondItemData = testData.secondInstance;
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToItem();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(firstItemData.barcodes[0]);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        secondItemData.barcodes[0],
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359149 Search "Item" by administrative note using query search (promin) (TaaS)',
      { tags: ['extendedPath', 'promin', 'C359149', 'eurekaPhase1'] },
      () => {
        queries.forEach(({ query, hasResults }) => {
          // Fill in the input field at the " Search & filter " pane with the following search query => Click on the "Search" button.
          InventorySearchAndFilter.searchByParameter('Query search', query);
          if (hasResults) {
            // Search completed and at the result list are being displayed the "Instance" records with "Holdings" with "Item" records to which you created "Administrative notes" from precondition.
            InventorySearchAndFilter.verifySearchResult(firstItemData.instanceTitle);
            InventorySearchAndFilter.verifySearchResult(secondItemData.instanceTitle);
          } else {
            // Search completed and no results found for excact match query.
            InventorySearchAndFilter.verifyResultPaneEmpty({
              noResultsFound: true,
              searchQuery: query,
            });
          }
        });

        // Edit the search query to " item.administrativeNotes ==/ string "Original, restore this Item 07-15-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.searchByParameter('Query search', queryForNote1);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" with "Item" record to which you created "Administrative notes" №1 from precondition.
        InventorySearchAndFilter.verifySearchResult(firstItemData.instanceTitle);
        // Edit the search query to " item.administrativeNotes ==/ string "Original, replace this Item 07-16-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.searchByParameter('Query search', queryForNote2);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" with "Item" record to which you created "Administrative notes" №2 from precondition.
        InventorySearchAndFilter.verifySearchResult(secondItemData.instanceTitle);
      },
    );
  });
});
