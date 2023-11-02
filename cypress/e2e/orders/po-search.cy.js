import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

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
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  afterEach(() => {
    Orders.selectFromResultsList(orderNumber);
    Orders.deleteOrderViaActions();
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C6717 Test the PO searches (thunderjet)',
    { tags: [TestType.smoke, devTeams.thunderjet] },
    () => {
      Orders.createOrderWithOrderLineViaApi(order, orderLine).then(({ poNumber }) => {
        orderNumber = poNumber;
        const today = new Date();
        cy.visit(TopMenu.ordersPath);
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
