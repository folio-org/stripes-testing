import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('orders: Close Order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
      orderLine.physical.materialSupplier = response;
      orderLine.eresource.accessProvider = response;
    });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` }).then((location) => {
      orderLine.locations[0].locationId = location.id;
    });
    cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
      orderLine.physical.materialType = materialType.id;
    });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C667 Close an existing order (thunderjet)',
    { tags: [TestType.smoke, devTeams.thunderjet] },
    () => {
      Orders.createOrderWithOrderLineViaApi(order, orderLine).then(({ poNumber }) => {
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', poNumber);
        Orders.selectFromResultsList(poNumber);
        Orders.openOrder();
        Orders.closeOrder('Cancelled');
        Orders.closeThirdPane();
        Orders.resetFilters();
        Orders.selectStatusInSearch('Closed');
        Orders.checkSearchResultsWithClosedOrder(poNumber);
      });
    },
  );
});
