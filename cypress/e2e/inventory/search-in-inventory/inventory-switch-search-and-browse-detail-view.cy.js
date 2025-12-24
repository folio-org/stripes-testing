import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C398016_FolioInstance_${randomPostfix}`,
      subjectValue: `AT_C398016_Subject_${randomPostfix}`,
      searchOption: searchItemsOptions.at(-3), // All
      user: {},
    };
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix: testData.instanceTitle,
      count: 1,
      holdingsCount: 0,
      itemsCount: 0,
    });
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C398016');

      cy.then(() => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances,
        });
      })
        .then(() => {
          instanceId = folioInstances[0].instanceId;

          cy.getInstanceById(instanceId).then((body) => {
            const requestBody = { ...body };
            requestBody.subjects = [
              {
                value: testData.subjectValue,
              },
            ];
            cy.updateInstance(requestBody);
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C398016 Switch from "Search" to "Browse" and back when only one record is displayed in search result pane (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C398016'] },
      () => {
        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
        InventorySearchAndFilter.fillInSearchQuery(testData.instanceTitle);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(testData.instanceTitle);

        BrowseSubjects.waitForSubjectToAppear(testData.subjectValue);

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.selectBrowseSubjects();
        BrowseSubjects.browse(testData.subjectValue);
        BrowseSubjects.checkSearchResultsTable();

        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.checkSearchQueryText(testData.instanceTitle);
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      },
    );
  });
});
