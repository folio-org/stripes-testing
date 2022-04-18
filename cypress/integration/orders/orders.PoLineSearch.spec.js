import NewOrder from '../../support/fragments/orders/newOrder';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('orders: Test Po line search', () => {
  const order = { ...NewOrder.defaultOrder };
  const orderLine = { ...basicOrderLine.specialOrderLine };

  before(() => {
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
    Orders.createOrderWithOrderLineViaApi(order, orderLine);
    cy.visit(TopMenu.ordersPath);
    Orders.selectOrderLines();
  });

  after(() => {
    cy.deleteOrderApi(order.id);
  });

  [
    { nameOfSearch: 'Keyword', valueOfLine: orderLine.titleOrPackage },
    { nameOfSearch: 'Contributor', valueOfLine: orderLine.contributors[0].contributor },
    // { nameOfSearch: 'PO line number', valueOfLine: orderLine.poLineNumber },
    { nameOfSearch: 'Requester', valueOfLine: orderLine.requester },
    { nameOfSearch: 'Title or package name', valueOfLine: orderLine.titleOrPackage },
    { nameOfSearch: 'Publisher', valueOfLine: orderLine.publisher },
    { nameOfSearch: 'Vendor account', valueOfLine: orderLine.vendorDetail.vendorAccount},
    { nameOfSearch: 'Vendor reference number', valueOfLine: orderLine.vendorDetail.referenceNumbers[0].refNumber },
    { nameOfSearch: 'Donor', valueOfLine: orderLine.donor },
    { nameOfSearch: 'Selector', valueOfLine: orderLine.selector },
    { nameOfSearch: 'Volumes', valueOfLine: orderLine.physical.volumes },
    { nameOfSearch: 'Product ID', valueOfLine: orderLine.details.productIds[0].productId },
    // { nameOfSearch: 'Product ID ISBN', valueOfLine: orderLine.details.productIds[0].productIdType },
  ].forEach((searcher) => {
    it('C6719 Test the POL searches', { tags: [TestType.smoke] }, () => {
      Orders.searchByParameter(searcher.nameOfSearch, searcher.valueOfLine);
      Orders.checkOrderlineSearchResults(orderLine.titleOrPackage);
      Orders.resetFilters();
    });
  });
});

