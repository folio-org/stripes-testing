import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';

describe('orders: Close Order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };

  before(() => {
    cy.getAdminToken();
    Organizations.getOrganizationViaApi({ query: 'name="Amazon.com"' })
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

  after(() => {
    Orders.deleteOrderApi(order.id);
  });

  it('C667 Close an existing order (thunderjet)', { tags: [TestType.smoke, devTeams.thunderjet] }, () => {
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
