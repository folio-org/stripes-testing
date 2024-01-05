import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-invoices: Invoice Line creation - based on POL', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...basicOrderLine.defaultOrderLine };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    addresses: [
      {
        addressLine1: '1 Centerpiece Blvd.',
        addressLine2: 'P.O. Box 15550',
        city: 'New Castle',
        stateRegion: 'DE',
        zipCode: '19720-5550',
        country: 'USA',
        isPrimary: true,
        categories: [],
        language: 'English',
      },
    ],
  };
  const euroCurrency = 'Euro (EUR)';
  const euroSign = '€';

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = organization.id;
      orderLine.physical.materialSupplier = organization.id;
      orderLine.eresource.accessProvider = organization.id;
    });
    invoice.accountingCode = organization.erpCode;
    invoice.vendorName = organization.name;
    Object.assign(
      vendorPrimaryAddress,
      organization.addresses.find((address) => address.isPrimary === true),
    );
    cy.getBatchGroups().then((batchGroup) => {
      invoice.batchGroup = batchGroup.name;
    });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` }).then((location) => {
      orderLine.locations[0].locationId = location.id;
    });
    cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
      orderLine.physical.materialType = materialType.id;
    });
    cy.loginAsAdmin();
    // set up invoice Line object
    invoiceLine.description = orderLine.titleOrPackage;
    invoiceLine.quantity = orderLine.cost.quantityPhysical;
    invoiceLine.subTotal = orderLine.cost.quantityPhysical * orderLine.cost.listUnitPrice;
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C2327 Create invoice line based on purchase order line (thunderjet)',
    { tags: ['smoke', 'thunderjet'] },
    () => {
      Orders.createOrderWithOrderLineViaApi(order, orderLine).then(({ poNumber }) => {
        cy.visit(TopMenu.invoicesPath);
        Invoices.createSpecialInvoice(invoice, vendorPrimaryAddress);
        Invoices.checkInvoiceCurrency(orderLine.cost.currency);
        Invoices.createInvoiceLineFromPol(poNumber);
        Invoices.checkInvoiceLine(invoiceLine);
        // check different currency case
        Invoices.updateCurrency(euroCurrency);
        Invoices.createInvoiceLineFromPol(poNumber);
        Invoices.checkConfirmationalPopup();
        Invoices.applyConfirmationalPopup();
        Invoices.checkInvoiceLine(invoiceLine, euroSign);
        Invoices.deleteInvoiceViaActions();
        Invoices.confirmInvoiceDeletion();
      });
    },
  );
});
