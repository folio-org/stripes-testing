describe('fse-locate-integration', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TCxxxx - Verify TBD for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['locate', 'fse', 'api'] },
    () => {
      cy.getHoldings().then((holdings) => {
        cy.log(holdings[0]);
      });
    },
  );
});
