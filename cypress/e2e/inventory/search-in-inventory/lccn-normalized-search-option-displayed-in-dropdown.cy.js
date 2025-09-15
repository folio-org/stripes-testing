import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      lccnOption: 'LCCN, normalized',
      containsAll: 'Contains all',
      defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
      defaultSearchOptionItem: 'Keyword (title, contributor, identifier, HRID, UUID)',
    };

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C442839 "LCCN, normalized" search option is displayed in the search option dropdown of "Inventory" app (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C442839'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.clickSearchOptionSelect();
        InventorySearchAndFilter.verifySearchOptionIncluded(testData.lccnOption);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.defaultSearchOption);
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.clickSearchOptionSelect();
        InventorySearchAndFilter.verifySearchOptionIncluded(testData.lccnOption, false);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.defaultSearchOptionItem,
        );
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.clickSearchOptionSelect();
        InventorySearchAndFilter.verifySearchOptionIncluded(testData.lccnOption, false);
        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.defaultSearchOption);
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(0, '', testData.containsAll, testData.lccnOption);
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '',
          testData.containsAll,
          testData.lccnOption,
        );
      },
    );
  });
});
