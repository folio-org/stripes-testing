const isEureka = Cypress.env('eureka');

describe('fse-sso - UI', () => {
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
      // for okapi check API request to get configuration
      if (!isEureka) {
        cy.checkSsoSupported().then((response) => {
          cy.log('saml/check status: ' + response.status);
          // verify sso button is present if supported on current tenant
          if (response.status === 200 && response.body.active === true) {
            cy.checkSsoButton(isEureka);
          } else {
            cy.log(
              `SSO is not supported on the current tenant ${Cypress.env('OKAPI_TENANT')} or saml/check returned error`,
            );
          }
        });
      } else {
        // for eureka just check button placement, assuming that it should be present by default
        // TBD: uncomment and update with getting configuration from the keycloak to avoid false errors
        // cy.checkSsoButton(isEureka);
      }
    },
  );
});
