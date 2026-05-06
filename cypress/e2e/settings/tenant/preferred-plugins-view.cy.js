import { Permissions } from '../../../support/dictionary';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import PreferredPlugins from '../../../support/fragments/settings/tenant/general/preferredPlugins';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

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
      cy.createTempUser([
        Permissions.settingsTenantView.gui,
        Permissions.settingsTenantViewLocation.gui,
      ]).then((userProperties) => {
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
      'C410761 Settings - UI-Tenant-Settings Settings - View: Preferred Plugins (firebird)',
      { tags: ['extendedPath', 'firebird', 'C410761'] },
      () => {
        // Step 2: Click on the "Tenant" option — verify General + Location setup items
        TenantPane.goToTenantTab();
        TenantPane.verifyGeneralItems(true);
        TenantPane.verifyLocationSetupItems(true);

        // Step 3: Click on "Preferred Plugins" — pane opens, every plugin select is shown
        // with a lock icon next to its label, and there is no Save button (read-only).
        TenantPane.selectTenant(TENANTS.PREFERRED_PLUGINS);
        PreferredPlugins.waitLoading();
        PreferredPlugins.verifyReadOnlyPaneContent();
        pluginTypes.forEach((pluginType) => {
          PreferredPlugins.verifyPluginSelectExists(pluginType);
          PreferredPlugins.verifyPluginLabelHasLockIcon(pluginType);
        });

        // Step 4: For every dropdown all choices except the currently selected
        // one are inactive (disabled).
        pluginTypes.forEach((pluginType) => {
          PreferredPlugins.verifyPluginSelectIsReadOnly(pluginType);
        });
      },
    );
  });
});
