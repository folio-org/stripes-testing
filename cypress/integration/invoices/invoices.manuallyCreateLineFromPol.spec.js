import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import newOrder from '../../support/fragments/orders/newOrder';
import newOrderLine from '../../support/fragments/orders/newOrderLine';
import Orders from '../../support/fragments/orders/orders';

describe('ui-invoices: Invoice Line creation - based on POL', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const order = { ...newOrder.defaultOrder };
  const orderLine = { ...newOrderLine.defaultOrderLine };
  const locationName = 'Main Library';
  const euroCurrency = 'Euro (EUR)';
  const euroSign = '€';

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: `name=${invoice.vendorName}` })
      .then(({ body }) => {
        const orgRecord = body.organizations[0];
        invoice.accountingCode = orgRecord.erpCode;
        Object.assign(vendorPrimaryAddress,
          orgRecord.addresses.find(address => address.isPrimary === true));
        order.vendor = orgRecord.id;
        orderLine.physical.materialSupplier = orgRecord.id;
        orderLine.eresource.accessProvider = orgRecord.id;
      });
    cy.getBatchGroups()
      .then(({ body }) => {
        invoice.batchGroup = body.batchGroups[0].name;
      });
    cy.getLocations({ query: `name="${locationName}"` })
      .then(({ body }) => {
        orderLine.locations[0].locationId = body.locations[0].id;
      });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(({ body }) => {
        orderLine.physical.materialType = body.mtypes[0].id;
      });
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
        Invoices.createDefaultInvoiceViaUi(invoice, vendorPrimaryAddress);
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
