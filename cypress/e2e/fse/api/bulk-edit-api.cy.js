describe('fse-bulk-edit', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195813 - Get bulk edit logs user for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'bulk-edit', 'loc', 'TC195813'] },
    () => {
      cy.getBulkEditLogsUsers().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
