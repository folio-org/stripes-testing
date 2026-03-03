describe('fse-circulation-bff', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195957 - Get circulation-bff allowed service points for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'circulationBff', 'loc', 'TC195957'] },
    () => {
      cy.getCirculationBffAllowerServicePoints().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
