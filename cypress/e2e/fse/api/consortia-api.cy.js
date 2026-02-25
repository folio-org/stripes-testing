describe('fse-consortia-api', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195510 - Get consortia id for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['consortia-sanity', 'fse', 'api', 'TC195510'] },
    () => {
      cy.getConsortiaId().then((consortiaId) => {
        cy.expect(consortiaId).to.not.be.oneOf([null, '']);
      });
    },
  );
});
