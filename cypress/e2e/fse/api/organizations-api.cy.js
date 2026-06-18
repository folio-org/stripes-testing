describe('fse-organizations', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195377 - Get organization by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'organizations', 'loc', 'TC195377'] },
    () => {
      cy.getOrganizationsByStatus('Active').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
