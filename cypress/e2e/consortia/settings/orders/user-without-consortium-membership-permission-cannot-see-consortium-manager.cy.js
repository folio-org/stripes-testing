import Permissions from '../../../../support/dictionary/permissions';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Consortia', () => {
  describe('Settings', () => {
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
        Permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui,
        Permissions.settingsCircView.gui,
        Permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
        Permissions.invoiceSettingsAll.gui,
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.uiTenantSettingsSettingsLocation.gui,
        Permissions.calendarEditCalendars.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitSettingsPaneLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C380516 Users without "Settings (Consortia): Can manage consortium membership" permission can not see "Consortium manager" option in settings menu (ECS) (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C380516'] },
      () => {
        SettingsMenu.verifyConsortiumManagerOptionAbsent();
      },
    );
  });
});
