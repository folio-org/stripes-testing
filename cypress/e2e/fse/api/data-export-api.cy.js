describe('fse-data-export', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195290 - Get data export job by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'data-export', 'loc', 'TC195290'] },
    () => {
      cy.dataExportGetJobByStatus('COMMITTED').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
