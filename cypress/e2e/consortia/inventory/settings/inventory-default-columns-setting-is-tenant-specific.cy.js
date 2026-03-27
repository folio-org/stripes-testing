import { APPLICATION_NAMES, INVENTORY_COLUMN_HEADERS } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import DisplaySettings from '../../../../support/fragments/settings/inventory/instance-holdings-item/displaySettings';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Display settings', () => {
      describe('Consortia', () => {
        const instanceTitlePrefix = `AT_C813588_FolioInstance_${getRandomPostfix()}`;
        const folioInstances = InventoryInstances.generateFolioInstances({
          instanceTitlePrefix,
          count: 1,
          holdingsCount: 0,
        });
        const allDefaultColumns = Object.values(INVENTORY_COLUMN_HEADERS).slice(1);
        const allColumnsWithTitle = Object.values(INVENTORY_COLUMN_HEADERS);
        let user;

        before('Create test data, login', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.resetInventoryDisplaySettingsViaAPI();

          InventoryInstances.createFolioInstancesViaApi({ folioInstances });

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.inventoryViewEditGeneralSettings.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: user.userId,
              permissions: [
                Permissions.uiInventoryViewInstances.gui,
                Permissions.inventoryViewEditGeneralSettings.gui,
              ],
            });

            cy.affiliateUserToTenant({
              tenantId: Affiliations.University,
              userId: user.userId,
              permissions: [Permissions.uiInventoryViewInstances.gui],
            });

            cy.login(user.username, user.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.resetInventoryDisplaySettingsViaAPI();
          InventoryInstance.deleteInstanceViaApi(folioInstances[0].instanceId);
          Users.deleteViaApi(user.userId);

          cy.setTenant(Affiliations.College);
          cy.resetInventoryDisplaySettingsViaAPI();

          cy.setTenant(Affiliations.University);
          cy.resetInventoryDisplaySettingsViaAPI();
        });

        it(
          'C813588 Verify that Inventory "Default columns" setting is tenant specific (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C813588'] },
          () => {
            // Go to Settings > Inventory > Display settings on Central tenant
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
            DisplaySettings.waitloading();

            // Step 1: Uncheck Contributors and Publishers on Central
            DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS);
            DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.PUBLISHERS);
            DisplaySettings.verifyColumnCheckboxChecked(
              INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
              false,
            );
            DisplaySettings.verifyColumnCheckboxChecked(INVENTORY_COLUMN_HEADERS.PUBLISHERS, false);
            DisplaySettings.verifyColumnCheckboxChecked(INVENTORY_COLUMN_HEADERS.DATE, true);
            DisplaySettings.verifyColumnCheckboxChecked(INVENTORY_COLUMN_HEADERS.RELATION, true);
            DisplaySettings.verifyColumnCheckboxChecked(
              INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
              true,
            );

            // Step 2: Click Save
            DisplaySettings.clickSaveButton();
            DisplaySettings.checkAfterSaveSuccess();

            // Step 3: Go to Inventory app and run search on Central
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.waitLoading();
            InventoryInstances.searchByTitle(instanceTitlePrefix);
            InventorySearchAndFilter.validateSearchTableColumnsShown([
              INVENTORY_COLUMN_HEADERS.TITLE,
              INVENTORY_COLUMN_HEADERS.DATE,
              INVENTORY_COLUMN_HEADERS.RELATION,
              INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
            ]);
            InventorySearchAndFilter.validateSearchTableColumnsShown(
              [INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, INVENTORY_COLUMN_HEADERS.PUBLISHERS],
              false,
            );

            // Step 4: Switch to Member 1 (College)
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();

            // Step 5: Run search on Member 1 - all default columns should be visible
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(instanceTitlePrefix);
            InventorySearchAndFilter.validateSearchTableColumnsShown(allColumnsWithTitle);

            // Step 6: Go to Settings > Inventory > Display settings on Member 1
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsPane.waitLoading();
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
            DisplaySettings.waitloading();
            allDefaultColumns.forEach((col) => {
              DisplaySettings.verifyColumnCheckboxChecked(col, true);
            });

            // Step 7: Uncheck Date and Relation on Member 1
            DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.DATE);
            DisplaySettings.toggleColumnCheckbox(INVENTORY_COLUMN_HEADERS.RELATION);
            DisplaySettings.verifyColumnCheckboxChecked(
              INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
              true,
            );
            DisplaySettings.verifyColumnCheckboxChecked(INVENTORY_COLUMN_HEADERS.PUBLISHERS, true);
            DisplaySettings.verifyColumnCheckboxChecked(
              INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
              true,
            );

            // Step 8: Click Save on Member 1
            DisplaySettings.clickSaveButton();
            DisplaySettings.checkAfterSaveSuccess();

            // Step 9: Go to Inventory on Member 1 and run search
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.waitLoading();
            InventoryInstances.searchByTitle(instanceTitlePrefix);
            InventorySearchAndFilter.validateSearchTableColumnsShown([
              INVENTORY_COLUMN_HEADERS.TITLE,
              INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
              INVENTORY_COLUMN_HEADERS.PUBLISHERS,
              INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
            ]);
            InventorySearchAndFilter.validateSearchTableColumnsShown(
              [INVENTORY_COLUMN_HEADERS.DATE, INVENTORY_COLUMN_HEADERS.RELATION],
              false,
            );

            // Step 10: Switch to Member 2 (University)
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            InventoryInstances.waitContentLoading();

            // Step 11: Run search on Member 2 - all default columns should be visible
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(instanceTitlePrefix);
            InventorySearchAndFilter.validateSearchTableColumnsShown(allColumnsWithTitle);

            // Step 12: Switch back to Central
            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            InventoryInstances.waitContentLoading();

            // Step 13: Run search on Central - only Central-configured columns should show
            InventoryInstances.searchByTitle(instanceTitlePrefix);
            InventorySearchAndFilter.validateSearchTableColumnsShown([
              INVENTORY_COLUMN_HEADERS.TITLE,
              INVENTORY_COLUMN_HEADERS.DATE,
              INVENTORY_COLUMN_HEADERS.RELATION,
              INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
            ]);
            InventorySearchAndFilter.validateSearchTableColumnsShown(
              [INVENTORY_COLUMN_HEADERS.CONTRIBUTORS, INVENTORY_COLUMN_HEADERS.PUBLISHERS],
              false,
            );
          },
        );
      });
    });
  });
});
