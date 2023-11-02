import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import InteractorsTools from '../../support/utils/interactorsTools';
import Users from '../../support/fragments/users/users';

describe('orders: create an order', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  afterEach(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C663 Create an order and at least one order line for an ongoing order (thunderjet)',
    { tags: [TestType.smoke, devTeams.thunderjet] },
    () => {
      Orders.createOrder(order, true, false).then((orderId) => {
        order.id = orderId;
        OrderLines.addPOLine();
        OrderLines.fillInPOLineInfoViaUi();
        InteractorsTools.checkCalloutMessage('The purchase order line was successfully created');
        OrderLines.backToEditingOrder();
        Orders.checkCreatedOngoingOrder(order);
      });
    },
  );
});
