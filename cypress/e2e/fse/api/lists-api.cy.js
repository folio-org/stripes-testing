describe('fse-lists', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195523 - Get lists for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'serials', 'loc'] },
    () => {
      cy.getLists().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});