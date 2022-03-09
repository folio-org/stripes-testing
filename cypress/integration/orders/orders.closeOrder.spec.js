import newOrder from '../../support/fragments/orders/newOrder';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';
import testType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';

describe('orders: Close Order', () => {
  const order = { ...newOrder.defaultOrder };
  const orderLine = { ...basicOrderLine.defaultOrderLine };
  const locationName = 'Main Library';

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: 'name="Amazon.com"' })
      .then(organization => {
        order.vendor = organization.id;
        orderLine.physical.materialSupplier = organization.id;
        orderLine.eresource.accessProvider = organization.id;
      });
    cy.getLocations({ query: `name="${locationName}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C667 Close an existing order', { tags: [testType.smoke] }, () => {
    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(orderNumber => {
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Helper.selectFromResultsList();
        Orders.openOrderViaActions();
        Orders.closeOrderViaActions('Cancelled');
        Orders.closeThirdPane();
        Orders.resetFilters();
        Orders.selectStatusInSearch('Closed');
        Orders.checkSearchResults(orderNumber);
      });
  });
});
