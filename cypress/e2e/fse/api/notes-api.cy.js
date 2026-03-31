describe('fse-notes', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TCXXXXX - Get notes for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'notes'] },
    () => {
      cy.okapiRequest({
        method: 'GET',
        path: 'notes?limit=1',
        isDefaultSearchParamsRequired: false,
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('notes');
      });
    },
  );
});
