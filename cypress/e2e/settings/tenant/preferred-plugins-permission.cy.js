import { Permissions } from '../../../support/dictionary';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import PreferredPlugins from '../../../support/fragments/settings/tenant/general/preferredPlugins';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { NavListItem } from '../../../../interactors';

describe('Tenant', () => {
  describe('Settings', () => {
    const testData = {};
    // Plugin types displayed in the right pane of "Preferred plugins"
    const pluginTypes = [
      'bursar-export',
      'create-inventory-records',
      'ui-agreements-extension',
      'find-agreement',
      'find-authority',
      'find-contact',
      'find-eresource',
      'find-erm-usage-data-provider',
      'find-fund',
      'find-import-profile',
      'find-instance',
      'find-interface',
      'find-license',
      'find-organization',
      'find-package-title',
      'find-po-line',
      'find-user',
      'select-application',
      'query-builder',
      'quick-marc',
    ];

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
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C515 Permissions: Settings (tenant): Can maintain preferred plugins (firebird)',
      { tags: ['extendedPath', 'firebird', 'C515'] },
      () => {
        // Step 6: Open Settings App and navigate to Tenant settings -> Preferred plugins
        TenantPane.goToTenantTab();
        // Step 7.1: Confirm that user can see "Preferred plugins" menu option
        cy.expect(NavListItem(TENANTS.PREFERRED_PLUGINS).exists());
        // User without other tenant permissions should not see other General items
        [TENANTS.ADDRESSES, TENANTS.LANGUAGE_AND_LOCALIZATION, TENANTS.SERVICE_POINTS].forEach(
          (item) => {
            cy.expect(NavListItem(item).absent());
          },
        );
        TenantPane.selectTenant(TENANTS.PREFERRED_PLUGINS);
        PreferredPlugins.waitLoading();
        PreferredPlugins.verifyPaneContent();

        // Verify the preferred plugin selectors are displayed in the right pane
        pluginTypes.forEach((pluginType) => {
          PreferredPlugins.verifyPluginSelectExists(pluginType);
        });

        // Step 7.2: Select and save plugin version for plugins available in the right pane
        PreferredPlugins.selectPluginVersion(pluginTypes[1], '(none)');
        PreferredPlugins.verifySelectedPluginVersion(pluginTypes[1], '(none)');
        PreferredPlugins.verifySaveButtonEnabled();
        PreferredPlugins.clickSaveButton();
      },
    );
  });
});
