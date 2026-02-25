describe('fse-specification-storage', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195707 - Get a collection of specifications for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['ramsons', 'fse', 'api', 'sanity', 'specification-storage', 'loc', 'TC195707'] },
    () => {
      cy.checkSpecificationStorageApi().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('specifications');
        cy.expect(response.body).to.have.property('totalRecords');
      });
    },
  );
});
