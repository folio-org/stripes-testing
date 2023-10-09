import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: create an order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.ordersPath);
  });

  afterEach(() => {
    Orders.deleteOrderViaActions();
  });

  it('C660 Create an order (thunderjet)', { tags: [TestType.smoke, devTeams.thunderjet] }, () => {
    Orders.createOrder(order);
    Orders.checkCreatedOrder(order);
  });
});
