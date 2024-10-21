import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      searchQuery: '333.2.221.1.3',
      classificationOption: 'Classification, normalized',
    };
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.instanceTabIsDefault();
        },
      );
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466147 No results found when searching by "Classification, normalized" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466147'] },
      () => {
        InventorySearchAndFilter.selectSearchOption(testData.classificationOption);
        InventorySearchAndFilter.executeSearch(testData.searchQuery);
        InventorySearchAndFilter.verifyResultPaneEmpty(testData.searchQuery);
      },
    );
  });
});
