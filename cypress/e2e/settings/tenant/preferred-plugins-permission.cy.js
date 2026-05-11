import { Permissions } from '../../../support/dictionary';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import PreferredPlugins, {
  PLUGIN_TYPES,
} from '../../../support/fragments/settings/tenant/general/preferredPlugins';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Tenant', () => {
  describe('Settings', () => {
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSettingsTenantPlugins.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp('Settings');
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      // Reset the plugin chosen by the test to default ("---") so the next run
      // starts pristine; otherwise re-selecting the same value won't dirty the
      // form and Save will stay disabled.
      PreferredPlugins.resetPluginToDefaultViaApi(PLUGIN_TYPES[1]);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C515 Permissions: Settings (tenant): Can maintain preferred plugins (firebird)',
      { tags: ['extendedPath', 'firebird', 'C515'] },
      () => {
        // Step 6: Open Settings App and navigate to Tenant settings -> Preferred plugins
        TenantPane.goToTenantTab();
        // Step 7.1: Confirm that user can see "Preferred plugins" menu option
        TenantPane.verifyNavigationOption(TENANTS.PREFERRED_PLUGINS);
        // User without other tenant permissions should not see other General items
        [TENANTS.ADDRESSES, TENANTS.LANGUAGE_AND_LOCALIZATION, TENANTS.SERVICE_POINTS].forEach(
          (item) => {
            TenantPane.verifyNavigationOption(item, false);
          },
        );
        TenantPane.selectTenant(TENANTS.PREFERRED_PLUGINS);
        PreferredPlugins.waitLoading();
        PreferredPlugins.verifyPaneContent();

        // Verify the preferred plugin selectors are displayed in the right pane
        PLUGIN_TYPES.forEach((pluginType) => {
          PreferredPlugins.verifyPluginSelectExists(pluginType);
        });

        // Step 7.2: Select and save plugin version for plugins available in the right pane
        PreferredPlugins.selectPluginVersion(PLUGIN_TYPES[1], '(none)');
        PreferredPlugins.verifySelectedPluginVersion(PLUGIN_TYPES[1], '(none)');
        PreferredPlugins.verifySaveButtonEnabled();
        PreferredPlugins.clickSaveButton();
      },
    );
  });
});
