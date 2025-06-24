describe('fse-ldp-reporting', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195874 - Get LDP tables ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'reporting'] },
    () => {
      cy.getLdpTables().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195875 - Get LDP version ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'reporting'] },
    () => {
      cy.getLdpDbVersion().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195876 - Get LDP config ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'reporting'] },
    () => {
      cy.getLdpConfig().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195877 - Get LDP processes ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'reporting'] },
    () => {
      cy.getLdpDbProcesses().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC195878 - Get LDP updates ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'reporting'] },
    () => {
      cy.getLdpDbUpdates().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
