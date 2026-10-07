describe('fse-settings', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195383 - Verify settings for permission inspector, gobi integration and tenant application ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}
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

  it(
    `FDOPS-6962 - Verify mod-ncip configuration migrated into mod-settings for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'settings', 'ncip', 'FDOPS-6962'] },
    () => {
      cy.getNcipConfigCheck().then((checkResponse) => {
        const isNoNcipAgencySettings =
          checkResponse.status === 500 &&
          typeof checkResponse.body === 'string' &&
          checkResponse.body.includes('No NCIP agency settings found');

        if (isNoNcipAgencySettings) {
          cy.log('No NCIP configuration found for this tenant, skipping test');
          return;
        }

        cy.getSettingsEntriesByScope('mod-ncip').then((response) => {
          cy.expect(response.status).to.eq(200);
          cy.expect(response.body).to.have.property('items');
        });
      });
    },
  );
});
