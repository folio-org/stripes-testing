describe('fse-orders', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195335 - Get order by workflow status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'orders'] },
    () => {
      cy.getOrderByWorkflowStatus('Closed').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
