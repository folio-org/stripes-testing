import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {
      user: {},
    };
    const wildcardQueries = [
      'Sno*', // wildcard at the end
      'Sn*w', // wildcard in the middle
      '*now', // wildcard at the beginning
      '*', // only wildcard
    ];
    const errorCalloutText = 'Error returning results. Please retry or revise your search.';

    before('Create test data', () => {
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
    });

    it(
      'C358151 Verify that sensible error message displayed when user use search query with "*" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C358151'] },
      () => {
        // Step 1: Select "Browse" in "Search|Browse" toggle on "Search & Filter" pane
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        // Step 2: Click on the browse option dropdown and select "Contributors" option from the expanded dropdown
        BrowseContributors.select();
        InventorySearchAndFilter.showsOnlyNameTypeAccordion();

        wildcardQueries.forEach((query) => {
          // Step 3, 6, 9, 12: Fill in the input field with wildcard query
          BrowseContributors.searchRecordByName(query);

          // Step 4, 7, 10, 13: Click on the "Search" button and verify error message
          InteractorsTools.checkCalloutErrorMessage(errorCalloutText);
          InteractorsTools.dismissCallout(errorCalloutText);
          InteractorsTools.checkNoErrorCallouts();

          // Step 5, 8, 11: Clear the input field by clicking on the "x" icon and verify cleared
          InventorySearchAndFilter.clearBrowseInputField();

          // Verify default message is displayed
          InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        });
      },
    );
  });
});
