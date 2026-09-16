describe('fse-marigold', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `FDOPS-6444 - Verify Linked Data works search API for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'marigold', 'FDOPS-6444'] },
    () => {
      cy.getLinkedDataWorks('title=*').then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('content');
      });
    },
  );
});
