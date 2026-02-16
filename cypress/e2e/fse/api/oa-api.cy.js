describe('fse-oa', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC196025 - Get publication request by for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['oa', 'fse', 'api', 'mod-oa', 'TC196025'] },
    () => {
      cy.getPublicationRequestByTerm({
        query: '&match=identifiers.publicationIdentifier&term=*',
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );
});
