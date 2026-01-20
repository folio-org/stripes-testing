import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

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
    cy.getBookMaterialType().then((materialType) => {
      orderLine.physical.materialType = materialType.id;
    });
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it('C667 Close an existing order (thunderjet)', { tags: ['smoke', 'thunderjet', 'C667'] }, () => {
    Orders.createOrderWithOrderLineViaApi(order, orderLine).then(({ poNumber }) => {
      Orders.searchByParameter('PO number', poNumber);
      Orders.selectFromResultsList(poNumber);
      Orders.openOrder();
      Orders.closeOrder('Cancelled');
      Orders.closeThirdPane();
      Orders.resetFilters();
      Orders.selectStatusInSearch('Closed');
      Orders.checkSearchResultsWithClosedOrder(poNumber);
    });
  });
});
