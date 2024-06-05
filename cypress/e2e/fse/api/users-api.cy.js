describe('fse-users', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it('TC195392 - Get by username', { tags: ['sanity', 'fse', 'api', 'users'] }, () => {
    cy.getUsers({ limit: 1, query: '"username"="ebscosupport"' }).then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
