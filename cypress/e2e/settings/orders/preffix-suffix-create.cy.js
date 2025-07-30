import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewPreffixSuffix from '../../../support/fragments/settings/orders/newPreffixSuffix';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const order = { ...NewOrder.defaultOneTimeOrder };
    const poPreffix = { ...NewPreffixSuffix.defaultPreffix };
    const poSuffix = { ...NewPreffixSuffix.defaultSuffix };
    const orderNumber = Helper.getRandomOrderNumber();
    let user;
    let orderPrefixId;
    let orderSuffixId;

    before(() => {
      cy.getAdminToken();

      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
      });
      order.vendor = organization.name;
      order.orderType = 'One-time';
      SettingsOrders.createPrefixViaApi(poPreffix.name).then((prefixId) => {
        orderPrefixId = prefixId;
      });
      SettingsOrders.createSuffixViaApi(poSuffix.name).then((suffixId) => {
        orderSuffixId = suffixId;
      });
      SettingsOrders.setUserCanEditPONumberViaApi(true);

      cy.createTempUser([permissions.uiOrdersCreate.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after(() => {
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
      { tags: ['criticalPathFlaky', 'thunderjet', 'eurekaPhase1'] },
      () => {
        Orders.createOrderWithPONumberPreffixSuffix(
          poPreffix.name,
          poSuffix.name,
          orderNumber,
          order,
          false,
        ).then((orderId) => {
          order.id = orderId;
          Orders.checkCreatedOrderWithOrderNumber(
            organization.name,
            `${poPreffix.name}${orderNumber}${poSuffix.name}`,
          );
        });
      },
    );
  });
});
