import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: create an order', () => {
  const order = { ...NewOrder.defaultOrder };
  const organization = { ...newOrganization.defaultUiOrganizations };

  before(() => {
    cy.getAdminToken();
    cy.createOrganizationApi(organization);
    order.vendor = organization.name;
    order.orderType = 'One-time';
    cy.visit(TopMenu.ordersPath);
  });

  afterEach(() => {
    Orders.deleteOrderViaActions();
    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(returnedOrganization => {
        cy.deleteOrganizationApi(returnedOrganization.id);
      });
  });

  it('C660 Create an order', { tags: [TestType.smoke] }, () => {
    Orders.createOrder(order);
    Orders.checkCreatedOrder(order);
  });
});
