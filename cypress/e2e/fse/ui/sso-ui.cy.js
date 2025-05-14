const isEureka = Cypress.env('eureka');

describe('fse-sso - UI', () => {
  if (isEureka) {
    it.skip('Skipping tests for eureka tenants', () => {});
    return;
  }

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195393 - verify that SSO button is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'sso', 'sanity'] },
    () => {
      cy.checkSsoSupported().then((response) => {
        cy.log('saml/check status: ' + response.status);
        // verify sso button is present if supported on current tenant
        if (response.status === 200 && response.body.active === true) {
          cy.checkSsoButton();
        } else {
          cy.log(
            `SSO is not supported on the current tenant ${Cypress.env('OKAPI_TENANT')} or saml/check returned error`,
          );
        }
      });
    },
  );
});
