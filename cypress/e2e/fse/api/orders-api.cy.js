describe('fse-orders', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195335 - Get order by workflow status for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'orders', 'loc', 'TC195335'] },
    () => {
      cy.getOrderByWorkflowStatus('Closed').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `FDOPS-6489 - Purchase order line schema is the single consolidated one for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sanity', 'orders', 'trillium', 'FDOPS-6489'] },
    () => {
      cy.okapiRequest({
        path: 'orders/order-lines',
        searchParams: {
          limit: 100,
          query: 'cql.allRecords=1',
        },
        isDefaultSearchParamsRequired: false,
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body.poLines).to.be.an('array').with.length.greaterThan(0);
        response.body.poLines.forEach((poLine) => {
          cy.expect(poLine).to.not.have.property('reportingCodes');
          cy.expect(poLine).to.not.have.property('alerts');
          if (poLine.eresource && poLine.eresource.userLimit !== undefined) {
            cy.expect(poLine.eresource.userLimit).to.be.a('string');
          }
        });
      });
    },
  );
});
