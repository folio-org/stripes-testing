describe('fse-eholdings', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195060 - Get eholdings titles for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'eholdings', 'loc', 'TC195060'] },
    () => {
      cy.getEHoldingsTitlesViaAPI('time').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
