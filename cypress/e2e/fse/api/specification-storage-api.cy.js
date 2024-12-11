describe('fse-specification-storage', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195707 - Get a collection of specifications for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['ramsons', 'fse', 'api', 'specification-storage'] },
    () => {
      cy.getSpecificatoinIds().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
