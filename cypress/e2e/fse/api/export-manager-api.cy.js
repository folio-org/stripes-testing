describe('fse-export-manager', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195313 - Get export manager job by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'export-manager', 'loc', 'TC195313'] },
    () => {
      cy.getExportManagerJobByStatus('SUCCESSFUL').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
