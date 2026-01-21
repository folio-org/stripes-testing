import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import NewOrderLine from '../../support/fragments/orders/enchancedOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

describe('Invoices', () => {
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
    cy.getBookMaterialType().then((materialType) => {
      orderLine.physical.materialType = materialType.id;
    });
    cy.getProductIdTypes({ query: 'name=="ISBN"' }).then((productIdType) => {
      orderLine.details.productIds[0].productIdType = productIdType.id;
    });
    Orders.createOrderWithOrderLineViaApi(order, orderLine).then(({ poNumber }) => {
      createdOrderNumber = poNumber;
    });
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({ path: TopMenu.invoicesPath, waiter: Invoices.waitLoading });
    }, 20_000);
  });

  afterEach(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C350389 Test purchase order line plugin search (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C350389'] },
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
