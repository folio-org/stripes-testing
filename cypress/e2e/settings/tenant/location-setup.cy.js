import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';

let user;

describe('Settings: Location', () => {
  before('Create test data', () => {
    cy.createTempUser([Permissions.settingsTenantViewLocation.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: SettingsMenu.tenantPath,
        waiter: TenantPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C365628 Settings (tenant): View locations (firebird)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      [TENANTS.INSTITUTIONS, TENANTS.CAMPUSES, TENANTS.LIBRARIES, TENANTS.LOCATIONS].forEach(
        (tenant) => {
          const pane = TenantPane.selectTenant(tenant);

          pane.viewTable();
          pane.checkNoActionButtons();
        },
      );
    },
  );
});
