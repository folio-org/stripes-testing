describe('fse-receiving', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195379 - Get by title for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'receiving', 'loc', 'TC195379'] },
    () => {
      cy.getReceivingTitlesByOrderStatus('Pending').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
