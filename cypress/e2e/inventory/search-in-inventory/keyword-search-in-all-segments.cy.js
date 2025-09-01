import InventoryInstances, {
  searchInstancesOptions,
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C9308_FolioInstance_${randomPostfix}`;
    const keywordOptions = {
      instance: searchInstancesOptions[0],
      holdings: searchHoldingsOptions[0],
      item: searchItemsOptions[0],
    };

    const instanceIds = [];
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      for (let index = 0; index < 3; index++) {
        InventoryInstance.createInstanceViaApi({
          instanceTitle: `${instanceTitlePrefix}_${index}`,
        }).then(({ instanceData }) => {
          instanceIds.push(instanceData.instanceId);
        });
      }

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C9308 Verify an identical search on "Keyword (title, contributor, identifier, HRID, UUID)" in all three segments (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C9308'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordOptions.instance);
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        for (let index = 0; index < 3; index++) {
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
        }

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordOptions.holdings);
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        for (let index = 0; index < 3; index++) {
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
        }

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordOptions.item);
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        for (let index = 0; index < 3; index++) {
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
        }
      },
    );
  });
});
