import { Permissions } from '../../../support/dictionary';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {
      user: {},
      searchQuery: 'a',
      accordionOption: 'Personal name',
    };
    const expectedPageTitle = (query) => (query ? `Inventory - ${query} - Browse - FOLIO` : 'Inventory - FOLIO');
    let instances;

    before('Create test data', () => {
      cy.getAdminToken();
      instances = BrowseContributors.createInstancesWithContributor();
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
      Users.deleteViaApi(testData.user.userId);
      instances.forEach((instance) => InventoryInstance.deleteInstanceViaApi(instance.id));
    });

    it(
      'C423413 Correct page title in Inventory Browse (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423413'] },
      () => {
        // Navigate to Inventory app and switch to Browse tab
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseContributors.checkSearch();

        // Step 1: Select "Call numbers (all)" browse option
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        BrowseContributors.waitForContributorToAppear(instances[0].contributors[0].name);

        // Step 2: Input query and search - verify page title includes search query
        InventorySearchAndFilter.fillInBrowseSearch(testData.searchQuery);
        InventorySearchAndFilter.clickSearch();
        cy.title().should('eq', expectedPageTitle(testData.searchQuery));

        // Step 4: Click "Reset all" button - verify page title resets
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkSearch();
        cy.title().should('eq', 'Inventory - FOLIO');

        // Step 5: Select "Contributors" browse option
        BrowseContributors.select();

        // Step 6: Select any values in any facets - page title should remain default
        // Try to expand name type section and select an option if available
        BrowseContributors.expandNameTypeSection();
        BrowseContributors.expandNameTypeMenu();
        BrowseContributors.selectNameTypeOption(testData.accordionOption);
        cy.title().should('eq', 'Inventory - FOLIO');

        // Step 7: Input query in browse field and search
        InventorySearchAndFilter.fillInBrowseSearch(testData.searchQuery);
        InventorySearchAndFilter.clickSearch();
        cy.title().should('eq', expectedPageTitle(testData.searchQuery));

        // Step 8: Click "Reset all" button
        InventorySearchAndFilter.clickResetAllButton();
        cy.title().should('eq', expectedPageTitle());

        // Step 9: Select "Subjects" browse option and search
        BrowseSubjects.select();
        InventorySearchAndFilter.fillInBrowseSearch(testData.searchQuery);
        InventorySearchAndFilter.clickSearch();
        cy.title().should('eq', expectedPageTitle(testData.searchQuery));

        // Step 10: Click "Reset all" button
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkSearch();
        cy.title().should('eq', 'Inventory - FOLIO');

        // Step 11: Select specific call number type and search
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.fillInBrowseSearch(testData.searchQuery);
        InventorySearchAndFilter.clickSearch();
        cy.title().should('eq', expectedPageTitle(testData.searchQuery));

        // Step 12: Clear search input and press Enter
        InventorySearchAndFilter.fillInBrowseSearch('');
        cy.get('[id="input-record-search"]').type('{enter}');
        cy.title().should('eq', expectedPageTitle());
      },
    );
  });
});
