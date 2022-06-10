import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: Close Order', () => {
  const order = { ...NewOrder.defaultOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const organization = { ...newOrganization.defaultUiOrganizations };

  before(() => {
    cy.getAdminToken();
    cy.createOrganizationApi(organization);
    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(body => {
        order.vendor = body.id;
        orderLine.physical.materialSupplier = body.id;
        orderLine.eresource.accessProvider = body.id;
      });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after(() => {
    cy.deleteOrderApi(order.id);
    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(returnedOrganization => {
        cy.deleteOrganizationApi(returnedOrganization.id);
      });
  });

  it('C667 Close an existing order', { tags: [TestType.smoke] }, () => {
    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(orderNumber => {
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Helper.selectFromResultsList();
        Orders.openOrder();
        Orders.closeOrder('Cancelled');
        Orders.closeThirdPane();
        Orders.resetFilters();
        Orders.selectStatusInSearch('Closed');
        Orders.checkSearchResultsWithClosedOrder(orderNumber);
      });
  });
});
