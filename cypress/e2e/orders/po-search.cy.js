import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';

describe('orders: Test PO search', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let orderNumber;

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
  });

  afterEach(() => {
    cy.getAdminToken();
    Orders.selectFromResultsList(orderNumber);
    Orders.deleteOrderViaActions();
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C6717 Test the PO searches (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'shiftLeft', 'eurekaPhase1'] },
    () => {
      Orders.createOrderWithOrderLineViaApi(order, orderLine).then(({ poNumber }) => {
        orderNumber = poNumber;
        const today = new Date();
        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        }, 20_000);
        Orders.checkPoSearch(
          Orders.getSearchParamsMap(
            orderNumber,
            DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY'),
          ),
          orderNumber,
        );
        // open order to check 'date opened' search
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.openOrder();
        Orders.closeThirdPane();
        Orders.resetFilters();
        Orders.searchByParameter(
          'Date opened',
          DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY'),
        );
        Orders.checkSearchResults(orderNumber);
      });
    },
  );
});
