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
        // User A: has edit permission on Central only (view-only on Member)
        // User B: has view-only on Central, edit permission on Member only
        let userA;
        let userB;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.resetInventoryDisplaySettingsViaAPI();

          // Create User A: edit on Central, view-only on Member
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
            userA = userProperties;

            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: userA.userId,
              permissions: [Permissions.uiInventoryViewInstances.gui],
            });
          });

          // Create User B: view-only on Central, edit on Member
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
          'C813589 Verify that user must have "edit" permissions to edit "Display settings" on current tenant (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C813589', 'nonParallel'] },
          () => {
            // Precondition: Log in as User A from Member tenant context
            cy.login(userA.username, userA.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();

            // Step 1: User A - verify no access to Inventory settings on Member tenant
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

            // Step 3: User B on Member tenant - go to Display settings and check/update columns
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
            DisplaySettings.waitloading();

            // Uncheck Date and Relation, keep Contributors, Publishers, Instance HRID checked
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

            // Step 6: User B - verify no access to Inventory settings on Central tenant
            SettingsPane.checkOptionInSecondPaneExists(APPLICATION_NAMES.INVENTORY, false);
          },
        );
      });
    });
  });
});
