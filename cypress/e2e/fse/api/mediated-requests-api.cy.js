describe('fse-mediated-requests', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195956 - Get mediated-requests for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'mediatedRequests', 'loc', 'TC195956'] },
    () => {
      cy.getMediatedRequests().then((mediatedRequestsResponse) => {
        cy.expect(mediatedRequestsResponse.status).to.eq(200);
        cy.expect(mediatedRequestsResponse.body).to.have.property('mediatedRequests');
      });
    },
  );
});
