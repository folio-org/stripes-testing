import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const defaultSearchOptionHoldings = 'Keyword (title, contributor, identifier, HRID, UUID)';
    const defaultSearchOptionItem = 'Keyword (title, contributor, identifier, HRID, UUID, barcode)';
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user = createdUserProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(createdUserProperties.username, createdUserProperties.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
        InventorySearchAndFilter.instanceTabIsDefault();
      });
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C464058 Check what options displayed in the search option dropdown in three segments: Instance, Holdings, Item (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C464058'] },
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
