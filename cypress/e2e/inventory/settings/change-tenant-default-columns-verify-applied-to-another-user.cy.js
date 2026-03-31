import { INVENTORY_COLUMN_HEADERS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    const instanceTitlePrefix = `AT_C813587_FolioInstance_${getRandomPostfix()}`;
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix,
      count: 1,
      holdingsCount: 0,
    });
    const columnsWithoutContributors = ['publishers', 'relation', 'hrid', 'normalizedDate1'];
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.resetInventoryDisplaySettingsViaAPI();

      // Precondition: User A (Admin) unchecks "Contributors" column in Display settings
      cy.getInventoryDisplaySettingsViaAPI().then((entries) => {
        if (entries.length) {
          const entry = { ...entries[0] };
          entry.value = { ...entry.value, defaultColumns: columnsWithoutContributors };
          cy.updateInventoryDisplaySettingsViaAPI(entry.id, entry);
        }
      });

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances,
      });

      // User B with required permissions
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.inventoryViewEditGeneralSettings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.resetInventoryDisplaySettingsViaAPI();
      InventoryInstance.deleteInstanceViaApi(folioInstances[0].instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C813587 Change tenant preferences of Inventory "Default columns" setting by User A and verify that changes has been applied to User B (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C813587', 'nonParallel'] },
      () => {
        // Step 1: Go to Inventory app and run any search
        InventoryInstances.searchByTitle(instanceTitlePrefix);

        // Verify only selected columns are displayed (no Contributors)
        InventorySearchAndFilter.validateSearchTableColumnsShown([
          INVENTORY_COLUMN_HEADERS.TITLE,
          INVENTORY_COLUMN_HEADERS.PUBLISHERS,
          INVENTORY_COLUMN_HEADERS.DATE,
          INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
        ]);
        InventorySearchAndFilter.validateSearchTableColumnsShown(
          INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
          false,
        );
      },
    );
  });
});
