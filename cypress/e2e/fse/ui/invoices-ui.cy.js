import TopMenu from '../../../support/fragments/topMenu';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';

describe('fse-invoices - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  // it(
  //   'TC195320 - verify that invoices page is displayed',
  //   { tags: ['sanity', 'fse', 'ui', 'invoices'] },
  //   () => {
  //     cy.visit(TopMenu.invoicesPath);
  //     Invoices.waitLoading();
  //   },
  // );

  it('TCxxxxx - create invoice', { tags: ['non-live', 'fse', 'ui', 'finance'] }, () => {
    const invoice = { ...NewInvoice.defaultUiInvoice };
    cy.getOrganizationsByStatus('Active').then((response) => {
      cy.log(response);
      invoice.accountingCode = response.erpCode;
    });
    cy.getBatchGroups().then((batchGroup) => {
      invoice.batchGroup = batchGroup.name;
    });

    cy.visit(TopMenu.invoicesPath);
    Invoices.waitLoading();
    Invoices.createDefaultInvoiceWithoutAddress(invoice);
    Invoices.checkCreatedInvoice(invoice);
    Invoices.deleteInvoiceViaActions();
    Invoices.confirmInvoiceDeletion();
  });
});
