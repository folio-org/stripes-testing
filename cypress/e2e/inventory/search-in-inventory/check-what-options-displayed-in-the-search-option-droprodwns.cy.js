import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const defaultSearchOptionHoldings = 'Keyword (title, contributor, identifier, HRID, UUID)';
    const defaultSearchOptionItem = 'Keyword (title, contributor, identifier, HRID, UUID)';
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user = createdUserProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.instanceTabIsDefault();
      });
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C736719 Check what options displayed in the search option dropdown in three segments: Instance, Holdings, Item (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C736719'] },
      () => {
        // 1 Click on the Search option dropdown placed at the "Search & filter" pane
        InventoryInstances.verifyInstanceSearchOptionsInOrder();

        // 2 Click on the "Holdings" tab in "Instance|Holdings|Item" toggle
        InventorySearchAndFilter.switchToHoldings();
        cy.wait(1000);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(defaultSearchOptionHoldings);
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyResultPaneEmpty();

        // 3 Click on the Search option dropdown placed at the "Search & filter" pane
        InventoryInstances.verifyHoldingsSearchOptionsInOrder();

        // 4 Click on the "Item" tab in "Instance|Holdings|Item" toggle
        InventorySearchAndFilter.switchToItem();
        cy.wait(1000);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(defaultSearchOptionItem);
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyResultPaneEmpty();

        // 5 Click on the Search option dropdown placed at the "Search & filter" pane
        InventoryInstances.verifyItemSearchOptionsInOrder();
      },
    );
  });
});
