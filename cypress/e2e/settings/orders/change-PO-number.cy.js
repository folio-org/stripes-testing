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
    cy.loginAsAdmin({ path:SettingsMenu.ordersPONumberEditPath, waiter: SettingsOrders.waitLoadingEditPONumber });
    SettingsOrders.userCanEditPONumber();

    cy.createTempUser([
      permissions.uiSettingsOrdersCanViewAllSettings.gui,
      permissions.uiOrdersCreate.gui,
    ]).then(userProperties => {
      user = userProperties;
      cy.login(user.username, user.password, { path:TopMenu.ordersPath, waiter: Orders.waitLoading });
    });
  });

  after(() => {
    cy.loginAsAdmin({ path:SettingsMenu.ordersPONumberEditPath, waiter: SettingsOrders.waitLoadingEditPONumber });
    SettingsOrders.userCanNotEditPONumber();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it('C670 Change the PO number setting from editable to non-editable, then create a couple POs to test it (thunderjet)', { tags: [TestType.criticalPath, devTeams.thunderjet] }, () => {
    Orders.createOrderWithPONumber(orderNumber, order, false).then(orderId => {
      order.id = orderId;
      Orders.checkCreatedOrderWithOrderNumber(organization.name, orderNumber);
    });
  });
});
