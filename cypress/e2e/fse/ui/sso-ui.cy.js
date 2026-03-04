const isEureka = Cypress.env('eureka');

describe('fse-sso - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195393 - verify that SSO button is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'sso', 'TC195393'] },
    () => {
      // Skip check for MCO
      if (Cypress.env('IS_CONSORTIA')) {
        cy.log('Skipping SSO check for MCO tenant');
        return;
      }

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
        cy.checkSsoButton(isEureka);
      }
    },
  );
});
