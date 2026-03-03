describe('fse-agreements', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195097 - Get agreement with active status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'agreements', 'loc', 'fast-check', 'TC195097'] },
    () => {
      cy.getAgreementsByStatus('active').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
