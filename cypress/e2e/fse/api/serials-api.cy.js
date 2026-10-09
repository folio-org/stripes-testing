describe('fse-serials', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195523 - Get serials by status for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'serials', 'loc', 'TC195523'] },
    () => {
      cy.getserialsByStatus().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `FDOPS-6965 - Serials model rulesets endpoint answers for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'serials', 'sanity', 'FDOPS-6965'] },
    () => {
      cy.getSerialsRulesets().then((response) => {
        cy.expect(response.status).to.eq(200);

        const rulesets = response.body.results ?? response.body;

        cy.expect(Array.isArray(rulesets)).to.eq(true);
      });
    },
  );
});
