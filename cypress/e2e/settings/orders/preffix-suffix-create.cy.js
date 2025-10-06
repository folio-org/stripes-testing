import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewPreffixSuffix from '../../../support/fragments/settings/orders/newPreffixSuffix';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('orders: Settings', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const poPreffix = { ...NewPreffixSuffix.defaultPreffix };
  const poSuffix = { ...NewPreffixSuffix.defaultSuffix };
  const orderNumber = Helper.getRandomOrderNumber();
  let user;

  before(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.ordersPrefixes,
      waiter: SettingsOrders.waitLoadingOrderSettings,
    });

    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    SettingsOrders.createPreffix(poPreffix);
    cy.visit(SettingsMenu.ordersSuffixes);
    SettingsOrders.createSuffix(poSuffix);
    cy.visit(SettingsMenu.ordersPONumberEditPath);
    SettingsOrders.userCanEditPONumber();

    cy.createTempUser([permissions.uiOrdersCreate.gui]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
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
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
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
