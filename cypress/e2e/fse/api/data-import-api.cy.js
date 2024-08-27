describe('fse-data-import', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195291 - Get data import job by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'data-import', 'loc'] },
    () => {
      cy.dataImportGetJobByStatus('COMMITTED').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
