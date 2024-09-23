describe('fse-users', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195392 - Get by username for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'users'] },
    () => {
      cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` }).then(
        (users) => {
          cy.expect(users[0].id).to.not.be.oneOf([null, '']);
        },
      );
    },
  );
});
