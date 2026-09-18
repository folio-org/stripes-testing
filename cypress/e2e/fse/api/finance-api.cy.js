describe('fse-finance', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195067 - Get fiscal year for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'finance', 'loc', 'TC195067'] },
    () => {
      cy.getFiscalYearsApi({ limit: 1 }).then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `FDOPS-6490 - Exchange rate source configuration is readable for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sanity', 'finance', 'trillium', 'FDOPS-6490'] },
    () => {
      cy.okapiRequest({
        path: 'finance-storage/exchange-rate-source',
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status === 404) {
          // no exchange rate source configured for this tenant - a clean not-configured response
          cy.expect(response.body).to.have.property('errors').that.is.an('array');
          return;
        }
        cy.expect(response.status).to.eq(200);
        // assert only presence and provider name, never the configured values (credentials live in the secret store)
        cy.expect(response.body).to.have.property('providerType').that.is.a('string');
        cy.expect(response.body).to.have.property('enabled').that.is.a('boolean');
      });
    },
  );
});
