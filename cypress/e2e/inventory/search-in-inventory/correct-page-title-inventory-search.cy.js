import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in inventory', () => {
    describe('Correct page title inventory search', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        titleAllOption: searchInstancesOptions[2],
        querySearchOption: searchInstancesOptions[17],
        languageAccordionName: 'Language',
        user: {},
        instance: {
          title: `AT_C423409_FolioInstance_${randomPostfix}`,
          id: '',
          language: 'English',
        },
        searchQueries: {
          basic: `AT_C423409_BasicSearch_${randomPostfix}`,
          query: `title="AT_C423409_QuerySearch_${randomPostfix}"`,
          all: '*',
        },
        expectedTitles: {
          default: 'Inventory - FOLIO',
          basicSearch: `Inventory - AT_C423409_BasicSearch_${randomPostfix} - Search - FOLIO`,
          querySearch: `Inventory - title="AT_C423409_QuerySearch_${randomPostfix}" - Search - FOLIO`,
          advancedSearch: `Inventory - title containsAll AT_C423409_BasicSearch_${randomPostfix} - Search - FOLIO`,
          all: 'Inventory - * - Search - FOLIO',
          instanceTitleSearch: '',
        },
      };

      before('Create test user and instance', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C423409_FolioInstance');

        // Create test instance with English language
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          cy.createInstance({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.instance.title,
              languages: ['eng'],
            },
          }).then((instanceId) => {
            testData.instance.id = instanceId;
            testData.expectedTitles.instanceTitleSearch = `Inventory - ${testData.instance.title} - FOLIO`;
          });
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test user and instance', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.id);
      });

      it(
        'C423409 Check "Inventory" correct page titles in browser tab (Instance tab) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423409'] },
        () => {
          // Steps 1, 2: Do a basic search with search text
          InventorySearchAndFilter.executeSearch(testData.searchQueries.basic);
          cy.title().should('eq', testData.expectedTitles.basicSearch);

          // Step 3: Do a query search
          InventorySearchAndFilter.selectSearchOptions(
            testData.querySearchOption,
            testData.searchQueries.query,
          );
          InventorySearchAndFilter.clickSearch();
          cy.title().should('eq', testData.expectedTitles.querySearch);

          // Step 4: Open advanced search modal
          InventoryInstances.clickAdvSearchButton();
          cy.title().should('eq', testData.expectedTitles.querySearch);

          // Step 5: Perform advanced search
          InventoryInstances.clickAdvSearchButton();
          InventoryInstances.fillAdvSearchRow(
            0,
            testData.searchQueries.basic,
            'Contains all',
            testData.titleAllOption,
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          cy.title().should('eq', testData.expectedTitles.advancedSearch);

          // Step 6: Reset all filters and facets
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.checkSearchQueryText('');
          cy.title().should('eq', testData.expectedTitles.default);

          // Step 7: Select facets (using Language facet with English)
          InventorySearchAndFilter.clickAccordionByName(testData.languageAccordionName);
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.languageAccordionName,
            testData.instance.language,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            testData.instance.language,
          );
          cy.title().should('eq', testData.expectedTitles.default);

          // Step 8: Do a basic search with search text
          InventorySearchAndFilter.executeSearch(testData.searchQueries.basic);
          cy.title().should('eq', testData.expectedTitles.basicSearch);

          // Step 9: Reset all filters and facets
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            testData.instance.language,
            false,
          );
          cy.title().should('eq', testData.expectedTitles.default);

          // Step 10: Do a basic search with search text
          InventorySearchAndFilter.executeSearch(testData.searchQueries.all);
          InventorySearchAndFilter.verifyResultListExists();
          cy.title().should('eq', testData.expectedTitles.all);

          // Step 11: Select facets (using Language facet with English)
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.languageAccordionName,
            testData.instance.language,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            testData.instance.language,
          );
          cy.title().should('eq', testData.expectedTitles.all);
          InventorySearchAndFilter.verifyResultListExists();
          cy.wait(3000);

          // Step 12: Reset all filters and facets
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.languageAccordionName,
            testData.instance.language,
            false,
          );
          cy.title().should('eq', testData.expectedTitles.default);

          // Step 13: Perform a search that returns single result and click on it
          InventorySearchAndFilter.executeSearch(testData.instance.title);
          InventoryInstances.selectInstanceByTitle(testData.instance.title);
          InventoryInstance.waitLoading();
          cy.title().should('eq', testData.expectedTitles.instanceTitleSearch);
          InventorySearchAndFilter.closeInstanceDetailPane();

          // Step 14: Clear search field
          InventorySearchAndFilter.clearSearchInputField();
          cy.get('[id="input-inventory-search"]').type('{enter}');
          cy.title().should('eq', testData.expectedTitles.default);
        },
      );
    });
  });
});
