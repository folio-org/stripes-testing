describe('fse-invoices', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195319 - Get invoice by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'invoice', 'loc', 'TC195319'] },
    () => {
      cy.getInvoiceByStatus('Paid').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
