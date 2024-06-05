describe('fse-invoices', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it('TC195319 - Get invoice by status', { tags: ['sanity', 'fse', 'api', 'invoices'] }, () => {
    cy.getInvoiceByStatus('Paid').then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
