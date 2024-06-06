describe('fse-requests', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it('TC195388 - Get request by status', { tags: ['sanity', 'fse', 'api', 'requests'] }, () => {
    cy.getItemRequestsApi({
      query: '(status=="Closed - Filled") sortby requestDate',
    }).then((response) => {
      cy.expect(response.status).to.eq(200);
    });
  });
});
