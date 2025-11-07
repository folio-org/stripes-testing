describe('SMTP api fast check', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TCxxxx - Get SMTP status by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'api', 'smtp-enabled'] },
    () => {
      cy.getSMTPStatus().then((response) => {
        const smtpHost = response.body.smtpConfigurations[0].host;
        cy.log('SMTP Host:', smtpHost);
        cy.expect(smtpHost).to.not.contain('disabled');
      });
    },
  );
});
