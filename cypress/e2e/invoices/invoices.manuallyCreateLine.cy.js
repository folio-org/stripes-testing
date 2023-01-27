import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-invoices: Invoice Line creation', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization)
    .then(response => {
      organization.id = response;
    });
  invoice.vendorName = organization.name;
  Organizations.getOrganizationViaApi({ query: `name=${invoice.vendorName}` })
  .then(organizationResponse => {
    invoice.accountingCode = organizationResponse.erpCode;
    cy.getBatchGroups()
      .then(batchGroup => { invoice.batchGroup = batchGroup.name; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.invoicesPath);
  });
  });

  it('C2326 Manually create invoice line (thunderjet)', { tags: [testType.smoke, devTeams.thunderjet] }, () => {
    Invoices.createInvoiceWithoutVendorAdress(invoice);
    Invoices.createInvoiceLine(invoiceLine);
    Invoices.checkInvoiceLine(invoiceLine);
    Invoices.deleteInvoiceViaActions();
    Invoices.confirmInvoiceDeletion();
  });
});
