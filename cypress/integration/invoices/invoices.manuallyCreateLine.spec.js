import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import testType from '../../support/dictionary/testTypes';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import devTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-invoices: Invoice Line creation', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const organization = { ...NewOrganization.defaultUiOrganizations,
    addresses:[{
      addressLine1: '1 Centerpiece Blvd.',
      addressLine2: 'P.O. Box 15550',
      city: 'New Castle',
      stateRegion: 'DE',
      zipCode: '19720-5550',
      country: 'USA',
      isPrimary: true,
      categories: [],
      language: 'English'
    }] };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
      });
    invoice.vendorName = organization.name;
    invoice.accountingCode = organization.erpCode;
    Object.assign(vendorPrimaryAddress,
      organization.addresses.find(address => address.isPrimary === true));
    cy.getBatchGroups()
      .then(batchGroup => { invoice.batchGroup = batchGroup.name; });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.invoicesPath);
  });

  after(() => {
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it('C2326 Manually create invoice line (thunderjet)', { tags: [testType.smoke, devTeams.thunderjet] }, () => {
    Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
    Invoices.createInvoiceLine(invoiceLine);
    Invoices.checkInvoiceLine(invoiceLine);
    Invoices.deleteInvoiceViaActions();
    Invoices.confirmInvoiceDeletion();
  });
});
