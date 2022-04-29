import NewOrder from '../../support/fragments/orders/newOrder';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import SearchHelper from '../../support/fragments/finance/financeHelper';

describe('orders: Test PO search', () => {
  const order = { ...NewOrder.defaultOrder };
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    cy.getOrganizationApi({ query: 'name="Amazon.com"' })
      .then(organization => {
        order.vendor = organization.id;
      });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.createOrderApi(order)
      .then((response) => {
        orderNumber = response.body.poNumber;
        cy.visit(TopMenu.ordersPath);
      });
  });

  afterEach(() => {
    cy.deleteOrderApi(order.id);
  });

  it('C343242 Create an order line for format = P/E mix', { tags: [TestType.smoke] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    SearchHelper.selectFromResultsList();
    Orders.createPOLineViaActions();
  });
});
