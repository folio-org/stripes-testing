describe('fse-timers', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC196314 - Get timers for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'sanity', 'timers'] },
    () => {
      cy.getTimers().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log('total records: ' + response.body.totalRecords);
        cy.expect(response.body.totalRecords).to.eq(38);
        // Check that each timer descriptor has enabled = true
        response.body.timerDescriptors.forEach((timer) => {
          cy.wrap(timer.enabled).should('be.true');
        });
      });
    },
  );
});
