describe('fse-licenses', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195325 - Get licenses by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'licenses'] },
    () => {
      cy.getLicensesByStatus('active').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
