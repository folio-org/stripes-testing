describe('fse-users - eureka', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195518 - check users-keycloak API for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['eureka-sanity', 'fse', 'api', 'users', 'loc', 'TC195518'] },
    () => {
      cy.getKeycloakUsersInfo().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body.user.username.toLowerCase()).to.eq(
          Cypress.env('diku_login').toLowerCase(),
        );
      });
    },
  );

  it(
    `TC195517 - get user capabilities for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['eureka-sanity', 'fse', 'api', 'users', 'capabilities', 'loc', 'TC195517'] },
    () => {
      cy.getKeycloakUsersInfo().then((response) => {
        cy.getCapabilitiesForUserApi(response.body.user.id).then((capabilitiesResponse) => {
          cy.expect(capabilitiesResponse.status).to.eq(200);
          cy.expect(capabilitiesResponse.body.totalRecords).to.not.be.oneOf([null, '']);
        });
      });
    },
  );

  it(
    `TC195521 - get user policies for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['eureka-sanity', 'fse', 'api', 'users', 'policies', 'loc', 'TC195521'] },
    () => {
      cy.getKeycloakUsersInfo().then((response) => {
        cy.getAuthorizationPoliciesForEntityApi('user', response.body.user.id).then(
          (policiesResponse) => {
            cy.expect(policiesResponse.status).to.eq(200);
            cy.expect(policiesResponse.body.totalRecords).to.not.be.oneOf([null, '']);
          },
        );
      });
    },
  );

  it(
    `TC195522 - get user migrations for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['eureka-sanity', 'fse', 'api', 'users', 'migrations', 'loc', 'TC195522'] },
    () => {
      cy.getUserMigrations().then((migrationsResponse) => {
        cy.expect(migrationsResponse.status).to.eq(200);
        cy.expect(migrationsResponse.body.totalRecords).to.not.be.oneOf([null, '']);
      });
    },
  );
});
