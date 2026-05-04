import { APPLICATION_NAMES, INVENTORY_COLUMN_HEADERS } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import DisplaySettings from '../../../../support/fragments/settings/inventory/instance-holdings-item/displaySettings';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Display settings', () => {
      describe('Consortia', () => {
        let userA;
        let userB;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.resetInventoryDisplaySettingsViaAPI();

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.inventoryViewEditGeneralSettings.gui,
          ]).then((userProperties) => {
            userA = userProperties;

            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: userA.userId,
              permissions: [Permissions.uiInventoryViewInstances.gui],
            });
          });

          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
            userB = userProperties;

            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: userB.userId,
              permissions: [
                Permissions.uiInventoryViewInstances.gui,
                Permissions.inventoryViewEditGeneralSettings.gui,
              ],
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.resetInventoryDisplaySettingsViaAPI();
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);

          cy.setTenant(Affiliations.College);
          cy.resetInventoryDisplaySettingsViaAPI();
        });

        it(
          'C813589 Verify that "Display settings" access is controlled per-tenant in Consortia (spitfire)',

          { tags: ['extendedPathECS', 'spitfire', 'C813589'] },
          () => {
            cy.login(userA.username, userA.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();

            // Step 1: User A on Member tenant - no access to Inventory Settings
            SettingsPane.checkOptionInSecondPaneExists(APPLICATION_NAMES.INVENTORY, false);

            // Step 2: Log out, log in as User B from Member tenant context
            cy.logout();
            cy.login(userB.username, userB.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();

            // Step 3: User B on Member tenant - go to Display settings and uncheck Date and Relation
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
            DisplaySettings.waitloading();

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

            // Step 4: Click Save
            DisplaySettings.clickSaveButton();
            DisplaySettings.checkAfterSaveSuccess();

            // Step 5: Switch active affiliation to Central tenant
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsPane.waitLoading();
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            SettingsPane.waitLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Step 6: User B on Central tenant - no access to Inventory Settings
            SettingsPane.checkOptionInSecondPaneExists(APPLICATION_NAMES.INVENTORY, false);
          },
        );
      });
    });
  });
});
