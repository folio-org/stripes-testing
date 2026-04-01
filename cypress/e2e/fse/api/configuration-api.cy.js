describe('fse-configurations', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `US1499848 - sip2 configurations verification for ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sip2', 'configurations'] },
    () => {
      cy.okapiRequest({
        method: 'GET',
        path: 'configurations/entries',
        searchParams: { query: '(module==edge-sip2)' },
        isDefaultSearchParamsRequired: false,
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
        // check that sip2 configurations exist
        cy.expect(response.body.totalRecords).to.be.greaterThan(1);
        cy.expect(response.body).to.have.property('configs').that.is.an('array');
        // check module in configuration entries
        response.body.configs.forEach((entry) => {
          cy.expect(entry.module).to.eq('edge-sip2');
        });
      });
    },
  );
});
