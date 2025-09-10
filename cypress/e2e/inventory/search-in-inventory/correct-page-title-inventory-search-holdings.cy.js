import InventoryInstances, {
  searchHoldingsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C423411_FolioInstance_${randomPostfix}`;
    const testData = {
      keywordOption: 'Keyword (title, contributor, identifier)',
      querySearchOption: searchHoldingsOptions[10],
      sourceAccordionName: 'Source',
      folioInstance: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: `${instanceTitlePrefix}_orig`,
        holdingsCount: 1,
        itemsCount: 0,
      })[0],
      altInstance: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: `${instanceTitlePrefix}_alt`,
        holdingsCount: 1,
        itemsCount: 0,
      })[0],
      searchQueries: {
        basic: 'AT_C423411_FolioInstance',
        querySearch: 'title="AT_C423411_FolioInstance"',
      },
      sourceValue: INSTANCE_SOURCE_NAMES.FOLIO,
    };
    const advSearchGeneratedQuery = `keyword containsAll ${testData.searchQueries.basic}`;
    const getExpectedTitle = ({ query, title } = {}) => {
      if (!title && !query) return 'Inventory - FOLIO';
      if (title) return `Inventory - ${title} - FOLIO`;
      return `Inventory - ${query} - Search - FOLIO`;
    };

    let user;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C423411_FolioInstance');

      cy.then(() => {
        // Get required reference data
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
        }).then((res) => {
          location = res;
        });
      }).then(() => {
        // Create instances with 1 holdings
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: [testData.folioInstance],
          location,
        });
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: [testData.altInstance],
          location,
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstance.instanceId,
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.altInstance.instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C423411 Correct page title in Inventory Search ("Holdings" tab) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423411'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();

        // Steps 1, 2: Input any query in search input field → Click "Search" button and check title
        InventorySearchAndFilter.executeSearch(testData.searchQueries.basic);
        cy.title().should('eq', getExpectedTitle({ query: testData.searchQueries.basic }));

        // Step 3: Select "Query search" search option and search
        InventorySearchAndFilter.selectSearchOption(testData.querySearchOption);
        InventorySearchAndFilter.executeSearch(testData.searchQueries.querySearch);
        cy.title().should('eq', getExpectedTitle({ query: testData.searchQueries.querySearch }));

        // Step 4: Click on "Advanced search" button
        InventoryInstances.clickAdvSearchButton();

        // Step 5: Fill first line in modal and search
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.searchQueries.basic,
          'Contains all',
          testData.keywordOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        cy.title().should('eq', getExpectedTitle({ query: advSearchGeneratedQuery }));

        // Step 6: Click "Reset all" button
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.checkSearchQueryText('');
        cy.title().should('eq', getExpectedTitle());

        // Step 7: Select any values in any facets on the first pane
        InventorySearchAndFilter.clickAccordionByName(testData.sourceAccordionName);
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          testData.sourceAccordionName,
          testData.sourceValue,
        );
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          testData.sourceAccordionName,
          testData.sourceValue,
          true,
        );
        cy.title().should('eq', getExpectedTitle());

        // Step 8: Input any query and search
        InventorySearchAndFilter.executeSearch(testData.searchQueries.basic);
        cy.title().should('eq', getExpectedTitle({ query: testData.searchQueries.basic }));

        // Step 9: Click "Reset all" button
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          testData.sourceAccordionName,
          testData.sourceValue,
          false,
        );
        cy.title().should('eq', getExpectedTitle());

        // Step 10: Input any query and search
        InventorySearchAndFilter.executeSearch(testData.searchQueries.basic);
        InventorySearchAndFilter.verifyResultListExists();
        cy.title().should('eq', getExpectedTitle({ query: testData.searchQueries.basic }));

        // Step 11: Select any values in any facets on the first pane
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          testData.sourceAccordionName,
          testData.sourceValue,
        );
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          testData.sourceAccordionName,
          testData.sourceValue,
          true,
        );
        cy.title().should('eq', getExpectedTitle({ query: testData.searchQueries.basic }));
        InventorySearchAndFilter.verifyResultListExists();
        cy.wait(3000);

        // Step 12: Click "Reset all" button
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          testData.sourceAccordionName,
          testData.sourceValue,
          false,
        );
        cy.title().should('eq', getExpectedTitle());

        // Step 13: Input a query which will return only 1 record
        InventorySearchAndFilter.executeSearch(`${instanceTitlePrefix}_orig`);
        InventoryInstances.selectInstanceByTitle(`${instanceTitlePrefix}_orig`);
        InventoryInstance.waitLoading();
        cy.title().should('eq', getExpectedTitle({ title: `${instanceTitlePrefix}_orig` }));
        InventorySearchAndFilter.closeInstanceDetailPane();

        // Step 14: Clear search field
        InventorySearchAndFilter.clearSearchInputField();
        cy.get('[id="input-inventory-search"]').type('{enter}');
        cy.title().should('eq', getExpectedTitle());
      },
    );
  });
});
