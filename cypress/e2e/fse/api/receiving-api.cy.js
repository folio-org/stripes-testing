describe('fse-receiving', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it('TC - Get by order status', { tags: ['sanity', 'fse', 'api', 'receiving'] }, () => {
    cy.getReceivingTitlesByOrderStatus('Pending').then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
