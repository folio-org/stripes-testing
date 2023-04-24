import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Users from '../../../support/fragments/users/users';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../../support/fragments/topMenu';
import Orders from '../../../support/fragments/orders/orders';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Helper from '../../../support/fragments/finance/financeHelper';

describe('orders: Settings', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderNumber = Helper.getRandomOrderNumber();
  let user;

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
      });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.ordersPrefixes)
    SettingsOrders.createPreffix();
    cy.visit(SettingsMenu.ordersSuffixes);
    SettingsOrders.createSuffix();

    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
    ]).then(userProperties => {
      user = userProperties;
      cy.login(user.username, user.password, { path:TopMenu.ordersPath, waiter: Orders.waitLoading });
    });
  });

  after(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.ordersPrefixes)
    SettingsOrders.createPreffix();
    cy.visit(SettingsMenu.ordersSuffixes);
    SettingsOrders.createSuffix();
    Users.deleteViaApi(user.userId);
  });

  it('C671 Add a couple PO prefixes and suffixes, then create a couple POs and PO lines, selecting various prefixes and suffixes; also create a couple PO Lines to ensure that the prefixes/suffixes carry down to the PO Line numbers as well (thunderjet)', { tags: [TestType.criticalPath, devTeams.thunderjet] }, () => {
    Orders.createOrderWithPONumber(orderNumber, order, false).then(orderId => {
      order.id = orderId;
      Orders.checkCreatedOrderWithOrderNumber(organization.name, orderNumber);
    });
  });
});
