describe('fse-finance', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it('TC195067 - Get fiscal year', { tags: ['sanity', 'fse', 'api', 'finance'] }, () => {
    cy.getFiscalYearsApi({ limit: 1 }).then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
