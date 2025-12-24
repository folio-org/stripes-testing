import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C423619_FolioInstance_${randomPostfix}`,
      user: {},
    };
    const folioInstances = InventoryInstances.generateFolioInstances({
      count: 2,
      instanceTitlePrefix: testData.instanceTitlePrefix,
      holdingsCount: 0,
      itemsCount: 0,
    });
    const instanceIds = [];

    function searchAndVerifyClearIconWorks() {
      InventorySearchAndFilter.fillInSearchQuery(testData.instanceTitlePrefix);
      InventorySearchAndFilter.checkSearchQueryText(testData.instanceTitlePrefix);
      InventorySearchAndFilter.checkSearchButtonEnabled();
      InventorySearchAndFilter.focusOnSearchField();
      InventorySearchAndFilter.checkClearIconShownInSearchField();

      InventorySearchAndFilter.clearSearchInputField();
      InventorySearchAndFilter.checkClearIconShownInSearchField(false);
      InventorySearchAndFilter.checkSearchInputFieldInFocus(true);

      InventorySearchAndFilter.fillInSearchQuery(testData.instanceTitlePrefix);
      InventorySearchAndFilter.checkSearchQueryText(testData.instanceTitlePrefix);
      InventorySearchAndFilter.checkSearchButtonEnabled();
      InventorySearchAndFilter.focusOnSearchField();
      InventorySearchAndFilter.checkClearIconShownInSearchField();

      InventorySearchAndFilter.clickSearch();
      InventorySearchAndFilter.verifyResultListExists();
      InventorySearchAndFilter.checkSearchInputFieldInFocus(false);
      InventorySearchAndFilter.checkClearIconShownInSearchField(false);

      InventorySearchAndFilter.focusOnSearchField();
      InventorySearchAndFilter.checkClearIconShownInSearchField(true);
      InventorySearchAndFilter.checkSearchInputFieldInFocus(true);

      InventorySearchAndFilter.resizeSearchInputField(200, undefined);
      InventorySearchAndFilter.verifySearchInputFieldSize(200, undefined);
      InventorySearchAndFilter.checkClearIconShownInSearchField(true);

      InventorySearchAndFilter.clearSearchInputField();
      InventorySearchAndFilter.verifyResultListExists(false);
      InventorySearchAndFilter.checkClearIconShownInSearchField(false);
      InventorySearchAndFilter.checkSearchInputFieldInFocus(true);
    }

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C423619');

      cy.then(() => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances,
        });
      }).then(() => {
        instanceIds.push(...folioInstances.map((instance) => instance.instanceId));

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
        });
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
        authRefresh: true,
      });
      InventorySearchAndFilter.instanceTabIsDefault();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C423619 Instance search | Check the "x" icon in the Inventory app search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423619'] },
      () => {
        searchAndVerifyClearIconWorks();
      },
    );

    it(
      'C423621 Holdings search | Check the "x" icon in the Inventory app search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423621'] },
      () => {
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();

        searchAndVerifyClearIconWorks();
      },
    );

    it(
      'C423622 Item search | Check the "x" icon in the Inventory app search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423622'] },
      () => {
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();

        searchAndVerifyClearIconWorks();
      },
    );
  });
});
