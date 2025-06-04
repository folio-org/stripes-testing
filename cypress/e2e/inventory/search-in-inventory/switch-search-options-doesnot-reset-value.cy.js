import { Permissions } from '../../../support/dictionary';
import InventoryInstances, {
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      user: {},
      instanceSubjectsOption: 'Subject',
      instanceSubjectsValue: 'subject',
      instanceQuerySearchOption: 'Query search',
      instanceQuerySearchValue: 'querySearch',
      holdingsHRIDOption: 'Holdings HRID',
      holdingsHRIDValue: 'holdingsHrid',
      holdingsUUIDOption: 'Holdings UUID',
      holdingsUUIDValue: 'holdingsId',
      itemHRIDOption: 'Item HRID',
      itemHRIDValue: 'itemHrid',
      itemUUIDOption: 'Item UUID',
      itemUUIDValue: 'iid',
    };
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C353942 Verify that switching between search options doesnot reset its value to default (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C353942', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.verifySpecificTabHighlighted('Instance');
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.selectSearchOptions(testData.instanceQuerySearchOption, '');
        InventorySearchAndFilter.verifySelectedSearchOption(testData.instanceQuerySearchValue);
        InventorySearchAndFilter.selectSearchOptions(testData.instanceSubjectsOption, '');
        InventorySearchAndFilter.verifySelectedSearchOption(testData.instanceSubjectsValue);

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.verifySpecificTabHighlighted('Holdings');
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.searchTypeDropdownDefaultValue(searchHoldingsOptions[0]);
        InventorySearchAndFilter.selectSearchOptions(testData.holdingsHRIDOption, '');
        InventorySearchAndFilter.verifySelectedSearchOption(testData.holdingsHRIDValue);
        InventorySearchAndFilter.selectSearchOptions(testData.holdingsUUIDOption, '');
        InventorySearchAndFilter.verifySelectedSearchOption(testData.holdingsUUIDValue);

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.verifySpecificTabHighlighted('Item');
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.searchTypeDropdownDefaultValue(searchItemsOptions[0]);

        InventorySearchAndFilter.selectSearchOptions(testData.itemHRIDOption, '');
        InventorySearchAndFilter.verifySelectedSearchOption(testData.itemHRIDValue);
        InventorySearchAndFilter.selectSearchOptions(testData.itemUUIDOption, '');
        InventorySearchAndFilter.verifySelectedSearchOption(testData.itemUUIDValue);
      },
    );
  });
});
