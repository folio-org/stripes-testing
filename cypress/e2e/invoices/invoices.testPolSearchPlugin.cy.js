import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrderLine from '../../support/fragments/orders/enchancedOrderLine';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-invoices: test POL search plugin', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...NewOrderLine.defaultOrderLine };
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
  let createdOrderNumber;

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
    cy.getProductIdTypes({ query: 'name=="ISBN"' }).then((productIdType) => {
      orderLine.details.productIds[0].productIdType = productIdType.id;
    });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));

    Orders.createOrderWithOrderLineViaApi(order, orderLine).then(({ poNumber }) => {
      createdOrderNumber = poNumber;
    });

    cy.visit(TopMenu.invoicesPath);
  });

  afterEach(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C350389 Test purchase order line plugin search (thunderjet)',
    { tags: [testType.smoke, devTeams.thunderjet] },
    () => {
      Invoices.getSearchParamsMap(createdOrderNumber, orderLine);
      Invoices.createSpecialInvoice(invoice, vendorPrimaryAddress);
      Invoices.checkCreatedInvoice(invoice, vendorPrimaryAddress);
      Invoices.openPolSearchPlugin();
      Invoices.checkSearchPolPlugin(
        Invoices.getSearchParamsMap(createdOrderNumber, orderLine),
        orderLine.titleOrPackage,
      );
      Invoices.closeSearchPlugin();
      Invoices.deleteInvoiceViaActions();
      Invoices.confirmInvoiceDeletion();
    },
  );
});
