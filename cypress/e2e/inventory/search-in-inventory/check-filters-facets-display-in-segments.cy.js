import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const instanceAccordions = [
        'Effective location (item)',
        'Language',
        'Resource type',
        'Format',
        'Mode of issuance',
        'Nature of content',
        'Staff suppress',
        'Suppress from discovery',
        'Statistical code',
        'Date range',
        'Date created',
        'Date updated',
        'Instance status',
        'Source',
        'Tags',
      ];
      const holdingsAccordions = [
        'Effective location (item)',
        'Holdings permanent location',
        'Holdings type',
        'Suppress from discovery',
        'Statistical code',
        'Date created',
        'Date updated',
        'Source',
        'Tags',
      ];
      const itemAccordions = [
        'Item status',
        'Effective location (item)',
        'Holdings permanent location',
        'Material type',
        'Suppress from discovery',
        'Statistical code',
        'Date created',
        'Date updated',
        'Tags',
      ];
      let user;

      before('Create test user', () => {
        cy.createTempUser([
          Permissions.enableStaffSuppressFacet.gui,
          Permissions.uiInventoryViewInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476718 Check what filters and facets display in the three segments (Instance, Holdings, Item) in "Inventory" app (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476718'] },
        () => {
          // Verify we're on the Search tab and Instance tab by default
          InventorySearchAndFilter.verifySearchAndFilterPane();

          // Step 1: Check facets and filters displayed on Instance tab
          instanceAccordions.forEach((accordion) => {
            InventorySearchAndFilter.verifyAccordionExistance(accordion);
          });

          // Step 2: Click on the "Holdings" tab and verify accordions
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          holdingsAccordions.forEach((accordion) => {
            InventorySearchAndFilter.verifyAccordionExistance(accordion);
          });

          // Step 3: Click on the "Item" tab and verify accordions
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          itemAccordions.forEach((accordion) => {
            InventorySearchAndFilter.verifyAccordionExistance(accordion);
          });
        },
      );
    });
  });
});
