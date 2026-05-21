describe('fse-password-reset-config', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC196414 - Verify password reset link configuration for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'password-reset', 'TC196414'] },
    () => {
      const expectedTenantUrl = Cypress.config().baseUrl;

      cy.getPasswordResetConfigViaApi().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body.configs).to.not.equal(undefined);
        cy.expect(response.body.configs.length).to.be.greaterThan(0);

        const config = response.body.configs[0];
        cy.expect(config.module).to.eq('USERSBL');
        cy.expect(config.configName).to.eq('resetPassword');
        cy.expect(config.code).to.eq('FOLIO_HOST');
        cy.expect(config.value).to.eq(expectedTenantUrl);
      });
    },
  );
});
