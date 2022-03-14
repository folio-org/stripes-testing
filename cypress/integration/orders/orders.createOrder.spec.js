import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import testType from '../../support/dictionary/testTypes';

describe('ui-orders: create an order', () => {
  const order = { ...NewOrder.defaultOrder };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    order.vendor = 'Amazon.com';
    order.orderType = 'One-time';
    cy.visit(TopMenu.ordersPath);
  });

  afterEach(() => {
    Orders.deleteOrderViaActions();
  });

  it('C660 Create an order', { tags: [testType.smoke] }, () => {
    Orders.createOrder(order);
    Orders.checkCreatedOrder(order);
  });
});
