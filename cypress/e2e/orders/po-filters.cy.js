import NewInvoice from '../../support/fragments/invoices/newInvoice';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
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
    cy.getAdminToken();
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
      cy.loginAsAdmin();
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
    cy.getAdminToken();
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
      { tags: ['smoke', 'thunderjet'] },
      () => {
        filter.filterActions();
        Orders.checkSearchResults(orderNumber);
        Orders.resetFilters();
      },
    );
  });
});
