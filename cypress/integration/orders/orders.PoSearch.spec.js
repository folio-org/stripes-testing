import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';
import SearchHelper from '../../support/fragments/finance/financeHelper';

describe('orders: Test PO search', () => {
  const order = { ...NewOrder.defaultOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
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

  afterEach(() => {
    SearchHelper.selectFromResultsList();
    Orders.deleteOrderViaActions();
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
        Orders.openOrderViaActions();
        Orders.closeThirdPane();
        Orders.resetFilters();
        Orders.searchByParameter('Date opened', DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY'));
        Orders.checkSearchResults(orderNumber);
      });
  });
});
