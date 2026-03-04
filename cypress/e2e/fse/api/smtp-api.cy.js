describe('fse-smtp', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC196238 - Get SMTP status by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'smtp-enabled', 'TC196238'] },
    () => {
      cy.getSmtpStatus().then((response) => {
        cy.expect(response.status).to.eq(200);
        const smtpConfiguration = response.body.smtpConfigurations[0];

        if (Cypress.env('CHECK_SMTP_ENABLED')) {
          // when SMTP should be enabled, configuration must exist and host should not contain 'disabled'
          cy.expect(smtpConfiguration.host).to.not.contain('disabled');
        } else if (smtpConfiguration) {
          // when SMTP check is not required, if configuration exists, check if it's disabled
          cy.expect(smtpConfiguration.host).to.contain('disabled');
        } else {
          // no SMTP configuration - acceptable when CHECK_SMTP_ENABLED is false
          cy.log('SMTP host is not configured.');
        }
      });
    },
  );
});
