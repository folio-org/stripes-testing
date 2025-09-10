import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C2322_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions[1], // Contributor
      contributors: [
        `Smith, John ${randomPostfix}`,
        `Johnson, Mary ${randomPostfix}`,
        `Brown, David ${randomPostfix}`,
      ],
    };
    const instanceIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C2322_FolioInstance');
      cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          BrowseContributors.getContributorTypes().then((contributorTypes) => {
            // Create 3 instances with different contributors
            testData.contributors.forEach((contributor, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: `${testData.instanceTitlePrefix}_${index + 1}`,
                  contributors: [
                    {
                      name: contributor,
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeId: contributorTypes[0].id,
                      contributorTypeText: '',
                      primary: false,
                    },
                  ],
                },
              }).then((instanceData) => {
                instanceIds.push(instanceData.instanceId);
              });
            });
          });
        });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.user = userProperties;
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C2322 Search: Verify search on Contributor (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C2322'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();

        // Step 1: Open the Inventory app. Select the Instance segment.
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();

        // Step 2: Select Contributor search option from the drop down list.
        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

        // Step 3: Enter a contributor name
        InventoryInstances.searchByTitle(testData.contributors[0]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_1`);
        InventorySearchAndFilter.checkRowsCount(1);

        // Step 4: Use Reset all button to clear searches and repeat with second contributor
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchByParameter(testData.searchOption, testData.contributors[1]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_2`);
        InventorySearchAndFilter.checkRowsCount(1);

        // Repeat with third contributor name
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchByParameter(testData.searchOption, testData.contributors[2]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_3`);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
