describe('fse-agreements', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it('TC195097 - Get agreement with active status', { tags: ['sanity', 'fse', 'api'] }, () => {
    cy.getAgreementsByStatus('active').then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
