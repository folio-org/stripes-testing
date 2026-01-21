import permissions from '../../../support/dictionary/permissions';
import ListConfiguration from '../../../support/fragments/settings/orders/listConfiguration';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import RoutingAddress from '../../../support/fragments/settings/orders/routingAddress';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';

Cypress.on('uncaught:exception', () => false);

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let user;

    before(() => {
      cy.getAdminToken();

      cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: SettingsMenu.ordersRoutingAddressPath,
            waiter: RoutingAddress.waitLoading,
          });
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466206 "Routing address" option is displayed in "Orders" settings (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C466206'] },
      () => {
        RoutingAddress.selectAddressType('Home');
        RoutingAddress.save();
        RoutingAddress.checkAddressTypeOption('Home');
        RoutingAddress.selectAddressType('Order');
        SettingOrdersNavigationMenu.selectListConfiguration();
        RoutingAddress.closeWhitoutSaving();
        ListConfiguration.waitLoading();
        SettingOrdersNavigationMenu.selectRoutingAddress();
        RoutingAddress.waitLoading();
        RoutingAddress.selectAddressType('Order');
        SettingOrdersNavigationMenu.selectListConfiguration();
        RoutingAddress.keepEditing();
        RoutingAddress.save();
        RoutingAddress.checkAddressTypeOption('Order');
      },
    );
  });
});
