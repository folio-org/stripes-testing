import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import SearchHelper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewInvoice from '../../support/fragments/invoices/newInvoice';

describe('orders: Test PO search', () => {
  const order = { ...NewOrder.specialOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const invoice = { ...NewInvoice.defaultUiInvoice };

  beforeEach(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: 'name="Amazon.com"' })
      .then(organization => {
        order.vendor = organization.id;
        orderLine.physical.materialSupplier = organization.id;
        orderLine.eresource.accessProvider = organization.id;
      });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  afterEach(() => {
    SearchHelper.selectFromResultsList();
    Orders.deleteOrderViaActions();
  });

  [
    { filterActions: Orders.selectOpenStatusFilter },
    { filterActions: Orders.selectPrefixFilter },
    { filterActions: Orders.selectReEncumberFilter },
    { filterActions: Orders.selectOrderTypeFilter },
    { filterActions: () => { Orders.selectVendorFilter(invoice); } },
  ].forEach((filter) => {
    it('C6718 Test the PO filters with open Order ', { tags: [TestType.smoke] }, () => {
      Orders.createOrderWithOrderLineViaApi(order, orderLine)
        .then(orderNumber => {
          cy.visit(TopMenu.ordersPath);
          Orders.searchByParameter('PO number', orderNumber);
          SearchHelper.selectFromResultsList();
          Orders.openOrder();
          Orders.closeThirdPane();
          Orders.resetFilters();
          filter.filterActions();
          Orders.checkSearchResults(orderNumber);
          Orders.resetFilters();
          Orders.searchByParameter('PO number', orderNumber);
        });
    });
  });
});
