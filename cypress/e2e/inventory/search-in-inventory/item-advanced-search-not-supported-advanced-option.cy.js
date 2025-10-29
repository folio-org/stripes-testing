import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ADVANCED_SEARCH_MODIFIERS } from '../../../support/constants';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      user: {},
      instanceTitle: `AT_C423706_FolioInstance_${getRandomPostfix()} The`,
      searchQuery: 'The',
      generatedAdvancedSearchQuery: 'keyword containsAll The',
      advancedSearchOption: searchItemsOptions[13],
      keywordSearchOption: 'Keyword (title, contributor, identifier)',
      advSearchModifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
    };

    before('Create test data', () => {
      cy.getAdminToken();

      InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
        ({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;

          cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
            testData.user = createdUserProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C423706 Item | Using Advanced search with search query with not supported search option "Advanced search" in Inventory (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423706'] },
      () => {
        InventorySearchAndFilter.selectSearchOptions(
          testData.advancedSearchOption,
          testData.searchQuery,
        );
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.searchQuery,
          testData.advSearchModifier,
          testData.keywordSearchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advancedSearchOption);
        InventorySearchAndFilter.checkSearchQueryText(testData.generatedAdvancedSearchQuery);
        InventorySearchAndFilter.verifyResultListExists();
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
