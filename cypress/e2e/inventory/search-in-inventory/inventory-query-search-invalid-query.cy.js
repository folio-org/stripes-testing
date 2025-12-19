import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C357541_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: 'Query search',
      currentDate: DateTools.getFormattedDate({ date: new Date() }),
      searchCallUrlPart: '/search/instances*',
    };
    const validQuery = `metadata.createdDate <= "${testData.currentDate}"`;
    const invalidQueriesData = [
      { query: 'metadata.createdDate <= "2031-7-31"', errorMessage: 'Invalid date format' },
      { query: 'www.itemcase.com/test/uri', errorMessage: 'Failed to parse cql query' },
      { query: 'titles all "test"' },
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
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C357541');

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
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C357541 Invalid search request by "Query search" option leads to error (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C357541'] },
      () => {
        InventorySearchAndFilter.fillInSearchQuery(validQuery);
        InventorySearchAndFilter.checkSearchQueryText(validQuery);
        InventorySearchAndFilter.checkSearchButtonEnabled();

        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyResultListExists();

        invalidQueriesData.forEach((invalidQueryData) => {
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

          InventorySearchAndFilter.selectSearchOption(testData.searchOption);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

          InventorySearchAndFilter.fillInSearchQuery(invalidQueryData.query);
          InventorySearchAndFilter.checkSearchQueryText(invalidQueryData.query);
          InventorySearchAndFilter.checkSearchButtonEnabled();

          cy.intercept('GET', testData.searchCallUrlPart).as('searchCall');
          InventorySearchAndFilter.clickSearch();
          InventorySearchAndFilter.verifySearchErrorText(invalidQueryData.query);
          if (invalidQueryData.errorMessage) {
            cy.wait('@searchCall').then((intercept) => {
              expect(intercept.response.statusCode).to.match(/4\d{2}/);
              expect(intercept.response.body.errors[0].message).to.include(
                invalidQueryData.errorMessage,
              );
            });
          }
        });
      },
    );
  });
});
