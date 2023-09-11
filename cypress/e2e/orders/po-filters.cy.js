import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

describe('orders: Test PO filters', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    poNumberPrefix: 'pref',
    poNumberSuffix: 'suf',
    poNumber: `pref${generateItemBarcode()}suf`,
    reEncumber: true,
    manualPo: true,
    approved: true,
  };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  let orderNumber;

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
      orderLine.physical.materialSupplier = response;
      orderLine.eresource.accessProvider = response;
    });
    invoice.vendorName = organization.name;
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` }).then((location) => {
      orderLine.locations[0].locationId = location.id;
    });
    cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
      orderLine.physical.materialType = materialType.id;
      cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then((params) => {
          orderLine.acquisitionMethod = params.body.acquisitionMethods[0].id;
          orderLine.purchaseOrderId = order.id;
          cy.createOrderLineApi(orderLine);
        });
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.openOrder();
        Orders.closeThirdPane();
        Orders.resetFilters();
      });
    });
  });

  after(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  [
    { filterActions: Orders.selectOpenStatusFilter },
    { filterActions: Orders.selectPrefixFilter },
    { filterActions: Orders.selectReEncumberFilter },
    { filterActions: Orders.selectOrderTypeFilter },
    {
      filterActions: () => {
        Orders.selectVendorFilter(invoice);
      },
    },
  ].forEach((filter) => {
    it(
      'C6718 Test the PO filters with open Order [except tags] (thunderjet)',
      { tags: [TestType.smoke, devTeams.thunderjet] },
      () => {
        filter.filterActions();
        Orders.checkSearchResults(orderNumber);
        Orders.resetFilters();
      },
    );
  });
});
