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
      .then(organization => {
        invoice.accountingCode = organization.erpCode;
        Object.assign(vendorPrimaryAddress,
          organization.addresses.find(address => address.isPrimary === true));
      });
    cy.getBatchGroups()
      .then(batchGroup => { invoice.batchGroup = batchGroup.name; });
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
