import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchHoldingsOptions,
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
      instanceTitle: `AT_C423708_FolioInstance_${getRandomPostfix()} The`,
      initialSearchQuery: 'title all The',
      newSearchQuery: 'The',
      generatedAdvancedSearchQuery: 'keyword containsAll The',
      advancedSearchOption: searchHoldingsOptions[11],
      querySearchOption: searchHoldingsOptions[10],
      keywordSearchOption: searchHoldingsOptions[0],
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
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
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
      'C423708 Holdings | Using Advanced search with search query with not supported search option "Query search" in Inventory (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423708'] },
      () => {
        InventorySearchAndFilter.selectSearchOptions(
          testData.querySearchOption,
          testData.initialSearchQuery,
        );
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.initialSearchQuery,
          testData.advSearchModifier,
          testData.keywordSearchOption,
        );
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.newSearchQuery,
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
