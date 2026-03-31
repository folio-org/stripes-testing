describe('fse-calendar', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TCXXXXX - Get calendars for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'calendar'] },
    () => {
      cy.okapiRequest({
        method: 'GET',
        path: 'calendar/calendars?limit=1',
        isDefaultSearchParamsRequired: false,
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('calendars');
      });
    },
  );
});
