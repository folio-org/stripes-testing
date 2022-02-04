import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';

describe('ui-invoices: Invoice Line creation', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };

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

  it('C2326 Manually create invoice line', { tags: [testType.smoke] }, () => {
    Invoices.createDefaultInvoiceViaUi(invoice, vendorPrimaryAddress);
    Invoices.createInvoiceLine(invoiceLine, false);
    Invoices.checkInvoiceLine(invoiceLine);
    Invoices.deleteInvoiceViaActions();
  });
});
