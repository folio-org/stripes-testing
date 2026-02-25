describe('fse-settings', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195383 - Verify settings for permission inspector, gobi integration and tenant application for ${Cypress.env(
      'OKAPI_HOST',
    )}`,
    { tags: ['sanity', 'fse', 'api', 'settings', 'loc', 'TC195383'] },
    () => {
      cy.getPermissions().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
      cy.getGobiSettings().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
      cy.getTenantSettings().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
