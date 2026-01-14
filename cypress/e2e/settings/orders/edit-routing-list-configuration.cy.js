import permissions from '../../../support/dictionary/permissions';
import ListConfiguration from '../../../support/fragments/settings/orders/listConfiguration';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import RoutingAddress from '../../../support/fragments/settings/orders/routingAddress';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';

Cypress.on('uncaught:exception', () => false);

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const listConfigurationDesription = `LCD${getRandomPostfix()}`;
    const routingAddressLink = 'routing-address';
    let user;

    before(() => {
      cy.getAdminToken();

      cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: SettingsMenu.ordersListConfigurationPath,
            waiter: ListConfiguration.waitLoading,
          });
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466275 Edit routing list configuration (thunderjet)',
      { tags: ['criticalPathFlaky', 'thunderjet', 'C466275'] },
      () => {
        ListConfiguration.edit();
        ListConfiguration.fillInfoSectionFields(listConfigurationDesription, routingAddressLink);
        ListConfiguration.addLinkInBody();
        ListConfiguration.save();
        ListConfiguration.clickOnLinkInBody(routingAddressLink);
        RoutingAddress.waitLoading();
        SettingOrdersNavigationMenu.selectListConfiguration();
        ListConfiguration.preview();
        ListConfiguration.clickOnLinkInPreview(routingAddressLink);
        RoutingAddress.waitLoading();
      },
    );
  });
});
