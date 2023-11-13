import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Search in Inventory', () => {
  const testData = {
    user: {},
    instanceSubjectsOption: 'Subject',
    instanceSubjectsValue: 'subject',
    instanceQuerySearchOption: 'Query search',
    instanceQuerySearchValue: 'querySearch',
    holdingsHRIDOption: 'Holdings HRID',
    holdingsHRIDValue: 'hrid',
    holdingsUUIDOption: 'Holdings UUID',
    holdingsUUIDValue: 'hid',
    itemHRIDOption: 'Item HRID',
    itemHRIDValue: 'itemHrid',
    itemUUIDOption: 'Item UUID',
    itemUUIDValue: 'iid',
    defaultValue: 'all',
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
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.switchToInstance();
      InventorySearchAndFilter.verifySpecificTabHighlighted('Instance');
      InventorySearchAndFilter.verifySearchFieldIsEmpty();
      InventorySearchAndFilter.verifyResultPaneEmpty();
      InventorySearchAndFilter.verifySearchOption(
        testData.instanceQuerySearchOption,
        testData.instanceQuerySearchValue,
      );
      InventorySearchAndFilter.verifySearchOption(
        testData.instanceSubjectsOption,
        testData.instanceSubjectsValue,
      );

      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.verifySpecificTabHighlighted('Holdings');
      InventorySearchAndFilter.verifySearchFieldIsEmpty();
      InventorySearchAndFilter.verifyResultPaneEmpty();
      InventorySearchAndFilter.searchTypeDropdownDefaultValue(testData.defaultValue);
      InventorySearchAndFilter.verifySearchOption(
        testData.holdingsHRIDOption,
        testData.holdingsHRIDValue,
      );
      InventorySearchAndFilter.verifySearchOption(
        testData.holdingsUUIDOption,
        testData.holdingsUUIDValue,
      );

      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.verifySpecificTabHighlighted('Item');
      InventorySearchAndFilter.verifySearchFieldIsEmpty();
      InventorySearchAndFilter.verifyResultPaneEmpty();
      InventorySearchAndFilter.searchTypeDropdownDefaultValue(testData.defaultValue);
      InventorySearchAndFilter.verifySearchOption(testData.itemHRIDOption, testData.itemHRIDValue);
      InventorySearchAndFilter.verifySearchOption(testData.itemUUIDOption, testData.itemUUIDValue);
    },
  );
});
