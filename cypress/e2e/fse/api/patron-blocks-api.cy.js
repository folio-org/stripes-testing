describe('fse-patron-blocks', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TCXXXXX - Get patron block conditions for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'patron-blocks'] },
    () => {
      cy.okapiRequest({
        method: 'GET',
        path: 'patron-block-conditions?limit=10',
        isDefaultSearchParamsRequired: false,
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('patronBlockConditions');
      });
    },
  );
});
