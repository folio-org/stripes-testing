import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C380421_FolioInstance_${randomPostfix}`,
      user: {},
      searchOptions: {
        titleAll: searchInstancesOptions[2],
        holdingsKeyword: searchHoldingsOptions[0],
        holdingsNotes: searchHoldingsOptions[5],
        identifierAll: searchInstancesOptions[3],
        itemKeyword: searchItemsOptions[0],
        circulationNotes: searchItemsOptions[8],
      },
      queryPrefix: `AT_C380421_Query_${randomPostfix}`,
      allQuery: '*',
    };
    const waitLoading = () => cy.wait(1000);
    const queries = [
      `${testData.queryPrefix}_1`,
      `${testData.queryPrefix}_2`,
      `${testData.queryPrefix}_3`,
      `${testData.queryPrefix}_4`,
    ];
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix: testData.instanceTitle,
      count: 1,
      holdingsCount: 0,
      itemsCount: 0,
    });
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances,
      });
      instanceId = folioInstances[0].instanceId;

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.instanceTabIsDefault();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C380421 Switch between searching Instances, Holdings, Items using search options exclusive to each type (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C380421'] },
      () => {
        InventorySearchAndFilter.selectSearchOption(testData.searchOptions.titleAll);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOptions.titleAll);

        InventorySearchAndFilter.fillInSearchQuery(testData.allQuery);
        InventorySearchAndFilter.clickSearchAndVerifySearchExecuted();

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.searchOptions.holdingsKeyword,
        );

        InventorySearchAndFilter.fillInSearchQuery(testData.allQuery);
        InventorySearchAndFilter.clickSearchAndVerifySearchExecuted();

        InventorySearchAndFilter.selectSearchOption(testData.searchOptions.holdingsNotes);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.searchOptions.holdingsNotes,
        );

        InventorySearchAndFilter.clickSearchAndVerifySearchExecuted();

        waitLoading();
        cy.intercept('/search/instances*').as('getInstances1');
        InventorySearchAndFilter.switchToInstance();
        cy.wait('@getInstances1').its('response.statusCode').should('eq', 200);
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOptions.titleAll);
        InventorySearchAndFilter.checkSearchQueryText(testData.allQuery);

        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyResultListExists();

        InventorySearchAndFilter.selectSearchOption(testData.searchOptions.identifierAll);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.searchOptions.identifierAll,
        );

        InventorySearchAndFilter.fillInSearchQuery(queries[0]);
        InventorySearchAndFilter.clickSearchAndVerifySearchExecuted();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.searchOptions.itemKeyword,
        );

        InventorySearchAndFilter.fillInSearchQuery(queries[1]);
        InventorySearchAndFilter.clickSearchAndVerifySearchExecuted();

        InventorySearchAndFilter.selectSearchOption(testData.searchOptions.circulationNotes);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.searchOptions.circulationNotes,
        );

        InventorySearchAndFilter.fillInSearchQuery(queries[2]);
        InventorySearchAndFilter.clickSearchAndVerifySearchExecuted();

        waitLoading();
        cy.intercept('/search/instances*').as('getInstances2');
        InventorySearchAndFilter.switchToInstance();
        cy.wait('@getInstances2').its('response.statusCode').should('eq', 200);
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.searchOptions.identifierAll,
        );
        InventorySearchAndFilter.checkSearchQueryText(queries[0]);

        InventorySearchAndFilter.fillInSearchQuery(queries[3]);
        InventorySearchAndFilter.clickSearchAndVerifySearchExecuted();
      },
    );
  });
});
