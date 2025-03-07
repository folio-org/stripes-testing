import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    beforeEach('navigate to inventory', () => {
      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    it.skip(
      // test case obsolete
      'C347903 Verify "Browse call numbers" option on Holdings tab (firebird)',
      { tags: [] },
      () => {
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.browseCallNumberIsAbsent();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
      },
    );

    it.skip(
      // test case obsolete
      'C347923 Verify "Browse call numbers" option on Item tab (firebird)',
      { tags: [] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.browseCallNumberIsAbsent();
      },
    );
  });
});
