const TRILLIUM_ENTITLED_APPS = [
  'app-inventory',
  'app-agreements',
  'app-licenses',
  'app-serials-management',
  'app-fqm',
];

describe('fse-applications', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `FDOPS-6485 - Trillium applications remain entitled to the tenant for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sanity', 'applications', 'trillium', 'FDOPS-6485'] },
    () => {
      cy.getApplicationsForTenantApi(Cypress.env('OKAPI_TENANT')).then((appIds) => {
        TRILLIUM_ENTITLED_APPS.forEach((appName) => {
          cy.expect(
            appIds.some((id) => id.startsWith(`${appName}-`)),
            `"${appName}" is entitled to the tenant`,
          ).to.eq(true);
        });
      });
    },
  );
});
