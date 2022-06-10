import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';
import SearchHelper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: Test PO search', () => {
  const organization = { ...newOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };

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
  });

  afterEach(() => {
    SearchHelper.selectFromResultsList();
    Orders.deleteOrderViaActions();

    cy.getOrganizationApi({ query: `name="${organization.name}"` })
    .then(returnedOrganization => {
      cy.deleteOrganizationApi(returnedOrganization.id);
    });
  });

  it('C6717 Test the PO searches', { tags: [TestType.smoke] }, () => {
    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(orderNumber => {
        const today = new Date();
        cy.visit(TopMenu.ordersPath);
        Orders.checkPoSearch(Orders.getSearchParamsMap(orderNumber, DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY')),
          orderNumber);
        // open order to check 'date opened' search
        Orders.searchByParameter('PO number', orderNumber);
        SearchHelper.selectFromResultsList();
        Orders.openOrder();
        Orders.closeThirdPane();
        Orders.resetFilters();
        Orders.searchByParameter('Date opened', DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY'));
        Orders.checkSearchResults(orderNumber);
      });
  });
});
