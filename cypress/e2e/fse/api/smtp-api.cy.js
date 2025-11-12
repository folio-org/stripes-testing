describe('fse-smtp', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC196238 - Get SMTP status by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'smtp-enabled'] },
    () => {
      cy.getSmtpStatus().then((response) => {
        cy.expect(response.status).to.eq(200);
        const smtpHost = response.body.smtpConfigurations[0].host;
        cy.log('SMTP Host:', smtpHost);
        // host should not be empty or contain 'disabled'
        if (smtpHost) {
          cy.expect(smtpHost).to.not.contain('disabled');
        } else {
          throw new Error('SMTP host is empty');
        }
      });
    },
  );
});
