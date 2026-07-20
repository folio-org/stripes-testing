describe('fse-reading-room-access', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195706 - Get reading rooms for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'reading-room', 'loc', 'TC195706'] },
    () => {
      cy.getReadingRoom().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('readingRooms');
      });
    },
  );
});
