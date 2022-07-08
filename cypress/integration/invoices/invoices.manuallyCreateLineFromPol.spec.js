import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import newOrder from '../../support/fragments/orders/newOrder';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';

describe('ui-invoices: Invoice Line creation - based on POL', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const order = { ...newOrder.defaultOneTimeOrder };
  const orderLine = { ...basicOrderLine.defaultOrderLine };
  const euroCurrency = 'Euro (EUR)';
  const euroSign = '€';

  before(() => {
    cy.getAdminToken();
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
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // set up invoice Line object
    invoiceLine.description = orderLine.titleOrPackage;
    invoiceLine.quantity = orderLine.cost.quantityPhysical;
    invoiceLine.subTotal = orderLine.cost.quantityPhysical * orderLine.cost.listUnitPrice;
  });

  it('C2327 Create invoice line based on purchase order line', { tags: [testType.smoke] }, () => {
    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(orderNumber => {
        cy.visit(TopMenu.invoicesPath);
        Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
        Invoices.checkInvoiceCurrency(orderLine.cost.currency);
        Invoices.createInvoiceLineFromPol(orderNumber);
        Invoices.checkInvoiceLine(invoiceLine);
        // check different currency case
        Invoices.updateCurrency(euroCurrency);
        Invoices.createInvoiceLineFromPol(orderNumber);
        Invoices.checkConfirmationalPopup();
        Invoices.applyConfirmationalPopup();
        Invoices.checkInvoiceLine(invoiceLine, euroSign);
        Invoices.deleteInvoiceViaActions();
        Invoices.confirmInvoiceDeletion();
      });
  });
});
