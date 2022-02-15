import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import newOrder from '../../support/fragments/orders/newOrder';
import newOrderLine from '../../support/fragments/orders/newOrderLine';
import Orders from '../../support/fragments/orders/orders';

describe('ui-invoices: test POL search plugin', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const order = { ...newOrder.defaultOrder };
  const orderLine = { ...newOrderLine.defaultOrderLine };
  const locationName = 'Main Library';

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
    cy.getLocations({ query: `name="${locationName}"` })
      .then(location => { orderLine.locations[0].locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
    cy.getProductIdTypes({ query: 'name=="ISBN"' })
      .then(productIdType => { orderLine.details.productIds[0].productIdType = productIdType.id; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy.visit(TopMenu.invoicesPath);
  });

  afterEach(() => {
    cy.deleteOrderApi(order.id);
  });

  it('C350389 Test purchase order line plugin search', { tags: [testType.smoke] }, () => {
    Orders.createOrderWithOrderLineViaApi(order, orderLine)
      .then(orderNumber => {
        // set search params and values
        const searchParamsMap = new Map();
        searchParamsMap.set('Keyword', orderNumber)
          .set('Contributor', orderLine.contributors[0].contributor)
          .set('PO line number', orderNumber.toString().concat('-1'))
          .set('Requester', orderLine.requester)
          .set('Title or package name', orderLine.titleOrPackage)
          .set('Publisher', orderLine.publisher)
          .set('Vendor account', orderLine.vendorDetail.vendorAccount)
          .set('Vendor reference number', orderLine.vendorDetail.referenceNumbers[0].refNumber)
          .set('Donor', orderLine.donor)
          .set('Selector', orderLine.selector)
          .set('Volumes', orderLine.physical.volumes[0])
          .set('Product ID', orderLine.details.productIds[0].productId);
        // TODO: uncomment once bug UINV-355 will be fixed
        // .set('Product ID ISBN', orderLine.details.productIds[0].productId);
        Invoices.createDefaultInvoiceViaUi(invoice, vendorPrimaryAddress);
        Invoices.checkCreatedInvoice(invoice, vendorPrimaryAddress);
        Invoices.openPolSearchPlugin();
        for (const [key, value] of searchParamsMap.entries()) {
          Invoices.checkSearchPolPlugin(key, value, orderLine.titleOrPackage);
        }
        Invoices.closeSearchPlugin();
        Invoices.deleteInvoiceViaActions();
        Invoices.confirmInvoiceDeletion();
      });
  });
});
