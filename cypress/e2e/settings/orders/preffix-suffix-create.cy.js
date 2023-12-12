import permissions from '../../../support/dictionary/permissions';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Users from '../../../support/fragments/users/users';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../../support/fragments/topMenu';
import Orders from '../../../support/fragments/orders/orders';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewPreffixSuffix from '../../../support/fragments/settings/orders/newPreffixSuffix';

describe('orders: Settings', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const poPreffix = { ...NewPreffixSuffix.defaultPreffix };
  const poSuffix = { ...NewPreffixSuffix.defaultSuffix };
  const orderNumber = Helper.getRandomOrderNumber();
  let user;

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([permissions.uiOrdersCreate.gui]).then((userProperties) => {
      user = userProperties;
      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
      });
      order.vendor = organization.name;
      order.orderType = 'One-time';
      cy.loginAsAdmin();
      cy.visit(SettingsMenu.ordersPrefixes);
      SettingsOrders.createPreffix(poPreffix);
      cy.visit(SettingsMenu.ordersSuffixes);
      SettingsOrders.createSuffix(poSuffix);
      cy.visit(SettingsMenu.ordersPONumberEditPath);
      SettingsOrders.userCanEditPONumber();

      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    cy.loginAsAdmin({
      path: SettingsMenu.ordersPONumberEditPath,
      waiter: SettingsOrders.waitLoadingEditPONumber,
    });
    SettingsOrders.userCanNotEditPONumber();
    cy.visit(SettingsMenu.ordersPrefixes);
    SettingsOrders.deletePrefix(poPreffix);
    cy.visit(SettingsMenu.ordersSuffixes);
    SettingsOrders.deleteSuffix(poSuffix);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C671 Create prefix and suffix for purchase order (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'system'] },
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
