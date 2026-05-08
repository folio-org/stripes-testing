describe('fse-mosaic', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC196412 - Verify MOSAIC configuration endpoint for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'api', 'mosaic', 'sanity'] },
    () => {
      cy.getMosaicConfiguration().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.have.property('id');
        cy.expect(response.body).to.have.property('defaultTemplateId');
      });
    },
  );
});
