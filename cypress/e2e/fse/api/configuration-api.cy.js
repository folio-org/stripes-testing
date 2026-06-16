describe('fse-configurations', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC196408 - sip2 configurations verification for ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sip2', 'configurations'] },
    () => {
      cy.okapiRequest({
        method: 'GET',
        path: 'configurations/entries',
        searchParams: { query: '(module==edge-sip2)' },
        isDefaultSearchParamsRequired: false,
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
        // check that sip2 configurations exist
        cy.expect(response.body.totalRecords).to.be.greaterThan(1);
        cy.expect(response.body).to.have.property('configs').that.is.an('array');
        // check module in configuration entries
        response.body.configs.forEach((entry) => {
          cy.expect(entry.module).to.eq('edge-sip2');
        });
      });
    },
  );

  it(
    `TC196440 - OAI-PMH general configuration verification for ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sanity', 'oai-pmh', 'configurations', 'TC196440'] },
    () => {
      cy.getOaiPmhConfigurations('general').then((body) => {
        // check that OAI-PMH configuration exists
        cy.expect(body.totalRecords).to.be.greaterThan(0);
        cy.expect(body).to.have.property('configurationSettings').that.is.an('array');
        // Find the configuration entry where configName is "general"
        const config = body.configurationSettings.find((c) => c.configName === 'general');
        // Check baseUrl from configValue
        const expectedUrl = Cypress.config().baseUrl.replace('https://', 'https://edge-') + '/oai';
        // Special case: if baseUrl is http://folio.org/oai, skip the verification
        if (config.configValue.baseUrl === 'http://folio.org/oai') {
          cy.log('OAI-PMH baseUrl is set to default: http://folio.org/oai');
        } else {
          cy.expect(config.configValue.baseUrl).to.eq(expectedUrl);
        }
      });
    },
  );
});
