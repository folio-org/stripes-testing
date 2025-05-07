describe('fse-locate-integration - API', () => {
  // all test steps are hidden from report in order to hide sensitive edge related data (api key). TODO: update to hide only api key

  it(
    `TC195871 - edge-rtac verification for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
      // get any valid instance for the folio tenant
      cy.getInstance({ limit: 1, expandAll: true, query: 'id=*' }).then((instance) => {
        // check locate rtac call with related instance id
        cy.getLocateRtac(instance.id).then((response) => {
          cy.expect(response.status).to.eq(200);
        });
      });
    },
  );

  it(
    `TC195872 - edge-patron verification for ${Cypress.env('LOCATE_HOST')}`,
    { tags: ['fse', 'api', 'locate'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
      // get any valid user with external system id for the folio tenant
      cy.getUsers({ limit: 1, query: 'externalSystemId==*' }).then((users) => {
        // check locate patron call with related user external system id
        cy.getLocatePatron(users[0].externalSystemId).then((response) => {
          cy.expect(response.status).to.eq(200);
        });
      });
    },
  );
});
