describe('fse-eholdings', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it('TC195060 - Get eholdings titles', { tags: ['sanity', 'fse', 'api'] }, () => {
    cy.getEHoldingsTitlesViaAPI('time').then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
