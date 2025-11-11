import { ADVANCED_SEARCH_MODIFIERS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const testData = {
      searchQuery: 'C710369 query',
      booleanOr: 'OR',
      booleanAnd: 'AND',
      searchOptions: {
        keyword: 'Keyword (title, contributor, identifier)',
        titleAll: searchInstancesOptions[2],
      },
      regularSearchOption: searchInstancesOptions[0],
    };

    before('Create user', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C710369 Inventory | Use "Reset all" in "Advanced search" modal (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C710369'] },
      () => {
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();

        InventoryInstances.fillAdvSearchRow(
          0,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();
        InventoryInstances.focusOnAdvancedSearchField(0);
        InventoryInstances.verifyClearIconInAdvancedSearchField(0);

        InventoryInstances.clickResetAllBtnInAdvSearchModal();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled(false);
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '',
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );

        InventoryInstances.fillAdvSearchRow(
          0,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();
        InventoryInstances.focusOnAdvancedSearchField(0);
        InventoryInstances.verifyClearIconInAdvancedSearchField(0);

        InventoryInstances.clickClearIconInAdvancedSearchField(0);
        InventoryInstances.verifyClearIconInAdvancedSearchField(0, false);
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled(false);
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '',
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );

        InventoryInstances.fillAdvSearchRow(
          1,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
          testData.booleanOr,
        );
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();
        InventoryInstances.clickResetAllBtnInAdvSearchModal();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled(false);
        InventoryInstances.checkAdvSearchModalValues(
          1,
          '',
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
          testData.booleanAnd,
        );

        InventoryInstances.fillAdvSearchRow(
          2,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          testData.searchOptions.keyword,
        );
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();
        InventoryInstances.clickResetAllBtnInAdvSearchModal();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled(false);
        InventoryInstances.checkAdvSearchModalValues(
          2,
          '',
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );

        InventoryInstances.fillAdvSearchRow(
          3,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.titleAll,
        );
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();
        InventoryInstances.clickResetAllBtnInAdvSearchModal();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled(false);
        InventoryInstances.checkAdvSearchModalValues(
          3,
          '',
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );

        InventoryInstances.fillAdvSearchRow(
          4,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          testData.searchOptions.titleAll,
        );
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();
        InventoryInstances.clickResetAllBtnInAdvSearchModal();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled(false);
        InventoryInstances.checkAdvSearchModalValues(
          4,
          '',
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );

        InventoryInstances.fillAdvSearchRow(
          0,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          testData.searchOptions.titleAll,
        );
        for (let i = 1; i <= 5; i++) {
          InventoryInstances.fillAdvSearchRow(
            i,
            testData.searchQuery,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
            testData.searchOptions.titleAll,
            testData.booleanOr,
          );
        }
        cy.intercept('GET', '/search/instances*').as('getInstances');
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        cy.wait('@getInstances');
        InventoryInstances.checkAdvSearchModalAbsence();
        InventorySearchAndFilter.verifyNoRecordsFound();

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          testData.searchOptions.titleAll,
        );
        InventoryInstances.clickResetAllBtnInAdvSearchModal();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled(false);
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '',
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );
        for (let i = 1; i <= 5; i++) {
          InventoryInstances.checkAdvSearchModalValues(
            i,
            '',
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
            testData.searchOptions.keyword,
            testData.booleanAnd,
          );
        }
        InventorySearchAndFilter.verifyNoRecordsFound();

        InventoryInstances.fillAdvSearchRow(
          0,
          testData.searchQuery,
          ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
          testData.searchOptions.titleAll,
        );
        for (let i = 1; i <= 5; i++) {
          InventoryInstances.fillAdvSearchRow(
            i,
            testData.searchQuery,
            ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
            testData.searchOptions.titleAll,
            testData.booleanOr,
          );
        }
        cy.intercept('GET', '/search/instances*').as('getInstances2');
        cy.get('#advanced-search-modal').type('{enter}');
        cy.wait('@getInstances2');
        InventoryInstances.checkAdvSearchModalAbsence();
        InventorySearchAndFilter.verifyNoRecordsFound();

        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifySearchOptionAndQuery(testData.regularSearchOption, '');

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkResetAllButtonInAdvSearchModalEnabled();
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '',
          ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          testData.searchOptions.keyword,
        );
        for (let i = 1; i <= 5; i++) {
          InventoryInstances.checkAdvSearchModalValues(
            i,
            '',
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
            testData.searchOptions.keyword,
            testData.booleanAnd,
          );
        }
      },
    );
  });
});
