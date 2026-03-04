describe('fse-requests', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195388 - Get request by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'requests', 'loc', 'TC195388'] },
    () => {
      cy.getItemRequestsApi({
        query: '(status=="Closed - Filled") sortby requestDate',
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
