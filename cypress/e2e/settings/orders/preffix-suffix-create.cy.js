import Permissions from '../../../support/dictionary/permissions';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import { PrefixSuffix } from '../../../support/fragments/settings/orders/newPrefixSuffix';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const order = { ...NewOrder.defaultOneTimeOrder };
    const poPrefix = { ...PrefixSuffix.defaultPrefix };
    const poSuffix = { ...PrefixSuffix.defaultSuffix };
    let user;
    let orderPrefixId;
    let orderSuffixId;

    before('Create test data', () => {
      cy.getAdminToken();
      SettingsOrders.setUserCanEditPONumberViaApi(true);
      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
      });
      order.vendor = organization.name;
      order.orderType = 'One-time';
      SettingsOrders.createPrefixViaApi(poPrefix.name).then((prefixId) => {
        orderPrefixId = prefixId;
      });
      SettingsOrders.createSuffixViaApi(poSuffix.name).then((suffixId) => {
        orderSuffixId = suffixId;
      });

      cy.createTempUser([Permissions.uiOrdersCreate.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsOrders.setUserCanEditPONumberViaApi(false);
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      SettingsOrders.deletePrefixViaApi(orderPrefixId);
      SettingsOrders.deleteSuffixViaApi(orderSuffixId);
      SettingsOrders.setUserCanEditPONumberViaApi(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C671 Create prefix and suffix for purchase order (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C671'] },
      () => {
        Orders.createOrderWithPreffixSuffix(poPrefix.name, poSuffix.name, order, false).then(
          (orderData) => {
            order.id = orderData.id;

            Orders.checkOrderNumberContainsPrefixSuffix(poPrefix.name, poSuffix.name);
          },
        );
      },
    );
  });
});
