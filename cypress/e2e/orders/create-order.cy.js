import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

describe('Orders', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    cy.loginAsAdmin();
    cy.visit(TopMenu.ordersPath);
  });

  afterEach(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaActions();
  });

  it('C660 Create an order (thunderjet)', { tags: ['smoke', 'thunderjet', 'shiftLeft'] }, () => {
    Orders.createOrder(order);
    Orders.checkCreatedOrder(order);
  });
});
