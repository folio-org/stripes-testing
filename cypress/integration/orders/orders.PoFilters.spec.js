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
    { filterActions: Orders.selectPendingStatusFilter },
    { filterActions: Orders.selectPrefixFilter },
    { filterActions: Orders.selectAssignedToFilter },
    { filterActions: Orders.selectOrderTypeFilter },
    { filterActions: () => { Orders.selectVendorFilter(invoice); } },
    { filterActions: Orders.selectReasonForClosureFilter },
    { filterActions: Orders.selectReEncumberFilter },
    { filterActions: Orders.selectRenewalDateFilter },
    { filterActions: Orders.selectBillToFilter },
  ].forEach((filter) => {
    it('C6717 Test the PO searches', { tags: [TestType.smoke] }, () => {
      Orders.createOrderWithOrderLineViaApi(order, orderLine)
        .then(orderNumber => {
          cy.visit(TopMenu.ordersPath);
          // open order to check 'date opened' search
          filter.filterActions();
          Orders.checkSearchResults(orderNumber);
          Orders.resetFilters();
          Orders.searchByParameter('PO number', orderNumber);
        });
    });
  });
});
