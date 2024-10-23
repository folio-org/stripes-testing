describe('fse-usage-reports', () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TCxxxx - send basic usage report get requests for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'usage-reports'] },
    () => {
      cy.getUsageReportTitles().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log(response.body);
      });

      cy.getUsageReportPackages().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log(response.body);
      });

      cy.getUsageReportTitleData().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log(response.body);
      });

      cy.getUsageReportData().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.log(response.body);
      });
    },
  );
});
