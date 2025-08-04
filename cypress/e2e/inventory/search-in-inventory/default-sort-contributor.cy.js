import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import { INVENTORY_DEFAULT_SORT_OPTIONS } from '../../../support/constants';
import { randomizeArray } from '../../../support/utils/arrays';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C543869_Instance_${randomPostfix}`;
    const contributorPrefix = `C543869Contrib ${randomPostfix}`;
    const testData = {};
    const instancesData = [];
    const createdInstanceIds = [];
    const contributorIndexes = randomizeArray(Array.from(Array(10).keys()));

    contributorIndexes.forEach((contributorIndex, index) => {
      instancesData.push({
        title: `${titlePrefix} ${index}`,
        contributors: [
          {
            name: `${contributorPrefix} ${contributorIndexes[contributorIndex]}`,
          },
        ],
      });
    });

    before('Set display settings', () => {
      cy.getAdminToken();
      // delete existing related instances
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: 'title="C543869"',
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });

      cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS.toLowerCase());
    });

    before('Create data', () => {
      cy.getAdminToken();
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
            testData.userProperties = userProperties;
            instancesData.forEach((instance) => {
              instance.instanceTypeId = instanceTypes[0].id;
              instance.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
              InventoryInstances.createFolioInstanceViaApi({
                instance,
              }).then((instanceData) => {
                createdInstanceIds.push(instanceData.instanceId);
              });
            });
          });
        });
      });
    });

    after('Reset settings, delete data, users', () => {
      cy.getAdminToken();
      cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C543869 Default sort is applied to search result list in "Inventory" app according to selected option in settings ("Contributors" case) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C543869'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          InventoryInstances.searchByTitle(titlePrefix);
          InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
          InventoryInstances.checkResultListSortedByColumn(1);
          InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
          InventoryInstances.clickActionsButton();
          InventoryInstances.verifyActionsSortedBy(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
          InventoryInstances.actionsSortBy(INVENTORY_DEFAULT_SORT_OPTIONS.RELEVANCE);
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          InventorySearchAndFilter.verifyDefaultSearchInstanceOptionSelected();
          InventoryInstances.searchByTitle(titlePrefix);
          InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
          InventoryInstances.checkResultListSortedByColumn(1);
          InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
          InventoryInstances.clickActionsButton();
          InventoryInstances.verifyActionsSortedBy(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
        });
      },
    );
  });
});
