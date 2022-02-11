import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';

describe('ui-invoices: Invoice creation', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getOrganizationApi({ query: `name=${invoice.vendorName}` })
      .then(({ body }) => {
        invoice.accountingCode = body.organizations[0].erpCode;
        Object.assign(vendorPrimaryAddress,
          body.organizations[0].addresses.find(address => address.isPrimary === true));
      });
    cy.getBatchGroups()
      .then(({ body }) => {
        invoice.batchGroup = body.batchGroups[0].name;
      });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.invoicesPath);
  });

  it('C2299 Manually Create Invoice', { tags: [testType.smoke] }, () => {
    Invoices.createDefaultInvoiceViaUi(invoice, vendorPrimaryAddress);
    Invoices.checkCreatedInvoice(invoice, vendorPrimaryAddress);
    Invoices.deleteInvoiceViaActions();
    Invoices.confirmInvoiceDeletion();
  });
});
