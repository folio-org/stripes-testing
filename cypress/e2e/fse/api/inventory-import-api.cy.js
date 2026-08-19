describe('fse-inventory-import', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `FDOPS-5292 - Get running inventory import jobs for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sanity', 'inventory-import', 'FDOPS-5292', 'trillium'] },
    () => {
      cy.okapiRequest({
        method: 'GET',
        path: 'inventory-import/import-jobs',
        searchParams: {
          limit: 100,
          query: '(status=="RUNNING") sortby started/sort.descending',
        },
        isDefaultSearchParamsRequired: false,
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('importJobs');
      });
    },
  );
});
