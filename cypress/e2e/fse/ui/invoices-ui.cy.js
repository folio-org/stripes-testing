import TopMenu from '../../../support/fragments/topMenu';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';

describe('fse-invoices - UI for non-live tenants', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // get any active organization in order to create invoice
    cy.getOrganizationsByStatus('Active').then((response) => {
      invoice.accountingCode = response.body.organizations[0].erpCode;
      invoice.vendorName = response.body.organizations[0].name;
    });
    cy.getBatchGroups().then((batchGroup) => {
      invoice.batchGroup = batchGroup.name;
    });
    cy.allure().logCommandSteps();
  });

  it('TC195468 - create invoice', { tags: ['non-live', 'fse', 'ui', 'finance'] }, () => {
    cy.visit(TopMenu.invoicesPath);
    Invoices.waitLoading();
    Invoices.createDefaultInvoiceWithoutAddress(invoice);
    Invoices.checkCreatedInvoice(invoice);
    Invoices.deleteInvoiceViaActions();
    Invoices.confirmInvoiceDeletion();
  });
});

describe('fse-invoices - UI for live tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195320 - verify that invoices page is displayed',
    { tags: ['sanity', 'fse', 'ui', 'invoices'] },
    () => {
      cy.visit(TopMenu.invoicesPath);
      Invoices.waitLoading();
    },
  );
});
