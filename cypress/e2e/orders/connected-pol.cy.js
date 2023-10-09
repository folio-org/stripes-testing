import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import Users from '../../support/fragments/users/users';

describe('orders: create an order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    order.orderType = 'One-time';

    cy.createTempUser([permissions.uiOrdersCreate.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  afterEach(() => {
    Orders.deleteOrderViaApi(order.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C10926 Populate POL details from Inventory instance (thunderjet)',
    { tags: [TestType.smoke, devTeams.thunderjet] },
    () => {
      Orders.createOrder(order).then((orderId) => {
        order.id = orderId;
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
        OrderLines.checkConnectedInstance();
      });
    },
  );
});
