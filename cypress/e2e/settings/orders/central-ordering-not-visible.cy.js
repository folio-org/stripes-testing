import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import Users from '../../../support/fragments/users/users';

const NETWORK_ORDERING_OPTIONS = ['Network ordering', 'Central ordering'];

describe('Settings (Orders)', () => {
  describe('Network ordering visibility (NON-ECS)', () => {
    let user;

    before(() => {
      cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProps) => {
          user = userProps;
          cy.login(user.username, user.password, {
            path: TopMenu.settingsOrdersPath,
            waiter: SettingsOrders.waitLoadingOrderSettings,
          });
        },
      );
    });

    after(() => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466195 "Central ordering" option is not visible on NON-ECS environment (thunderjet)',
      { tags: ['Extended', 'thunderjet', 'C466195'] },
      () => {
        SettingsOrders.waitLoadingOrderSettings();
        SettingsOrders.verifyOptionsAbsentInSettingsOrders(NETWORK_ORDERING_OPTIONS);
      },
    );
  });
});
