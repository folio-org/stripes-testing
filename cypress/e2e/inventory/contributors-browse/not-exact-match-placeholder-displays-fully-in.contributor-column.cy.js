import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {
      instance: {},
      contributorName: `AT_C357577_contributor_${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
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
      'C357577 Verify that not-exact match placeholder displays fully in the "Contributor" column (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C357577', 'eurekaPhase1'] },
      () => {
        // Select "Browse", Click on the browse option dropdown and select “Contributors” option
        InventorySearchAndFilter.selectBrowseContributors();

        // Fill in the input field with the long not-existing contributor name, which will retrieve non-exact match result.
        // Click on the "Search" button.
        BrowseContributors.searchRecordByName(testData.instance.contributors[0].name);
        BrowseContributors.checkNonExactSearchResultForARow(testData.instance.contributors[0].name);
      },
    );
  });
});
