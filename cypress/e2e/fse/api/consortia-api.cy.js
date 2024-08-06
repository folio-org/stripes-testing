describe('fse-consortia-api', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it('TCXXXX - Get consortia id', { tags: ['consortia', 'fse', 'api'] }, () => {
    cy.getConsortiaId().then((consortiaId) => {
      cy.expect(consortiaId).to.not.be.oneOf([null, '']);
    });
  });
});
