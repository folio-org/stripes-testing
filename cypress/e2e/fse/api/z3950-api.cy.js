describe('fse-z3950', () => {
  it(
    `TC195634 - check z3950 service for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'z3950', 'TC195634'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.checkZ3950ServiceSearchAndRetrieve().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
