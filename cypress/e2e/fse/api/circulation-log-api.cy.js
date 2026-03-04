describe('fse-circulation-log', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195285 - Get log by loan status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'circulation-log', 'loc', 'TC195285'] },
    () => {
      cy.getByLoan('Checked in').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
