import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import newOrder from '../../support/fragments/orders/newOrder';
import newOrderLine from '../../support/fragments/orders/enchancedOrderLine';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';

describe('ui-invoices: test POL search plugin', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const order = { ...newOrder.defaultOrder };
  const orderLine = { ...newOrderLine.defaultOrderLine };
  let createdOrderNumber;

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: `name=${invoice.vendorName}` })
      .then(organization => {
        invoice.accountingCode = organization.erpCode;
        Object.assign(vendorPrimaryAddress,
          organization.addresses.find(address => address.isPrimary === true));
        order.vendor = organization.id;
        orderLine.physical.materialSupplier = organization.id;
        orderLine.eresource.accessProvider = organization.id;
      });
    cy.getBatchGroups()
      .then(batchGroup => { invoice.batchGroup = batchGroup.name; });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
    cy.getProductIdTypes({ query: 'name=="ISBN"' })
      .then(productIdType => { orderLine.details.productIds[0].productIdType = productIdType.id; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));

    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(orderNumber => {
        createdOrderNumber = orderNumber;
      });

    cy.visit(TopMenu.invoicesPath);
  });

  afterEach(() => {
    cy.deleteOrderApi(order.id);
  });

  it('C350389 Test purchase order line plugin search', { tags: [testType.smoke] }, () => {
    Invoices.getSearchParamsMap(createdOrderNumber, orderLine);
    Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
    Invoices.checkCreatedInvoice(invoice, vendorPrimaryAddress);
    Invoices.openPolSearchPlugin();
    Invoices.checkSearchPolPlugin(Invoices.getSearchParamsMap(createdOrderNumber, orderLine), orderLine.titleOrPackage);
    Invoices.closeSearchPlugin();
    Invoices.deleteInvoiceViaActions();
    Invoices.confirmInvoiceDeletion();
  });
});
