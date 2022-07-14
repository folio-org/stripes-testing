import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';

describe('orders: create an order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    order.vendor = 'Amazon.com';
    order.orderType = 'One-time';
    cy.visit(TopMenu.ordersPath);
  });

  afterEach(() => {
    Orders.deleteOrderViaActions();
  });

  it('C660 Create an order (thunderjet)', { tags: [TestType.smoke] }, () => {
    Orders.createOrder(order);
    Orders.checkCreatedOrder(order);
  });
});
