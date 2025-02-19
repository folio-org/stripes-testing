const isEureka = Cypress.config('eureka');

describe('fse-users - okapi', { retries: { runMode: 1 } }, () => {
  if (isEureka) {
    it.skip('Skipping tests for eureka tenants', () => {});
    return;
  }

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195392 - Get by username for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'users', 'loc'] },
    () => {
      cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` }).then(
        (users) => {
          cy.expect(users[0].id).to.not.be.oneOf([null, '']);
        },
      );
    },
  );
});

describe('fse-users - eureka', { retries: { runMode: 1 } }, () => {
  if (!isEureka) {
    it.skip('Skipping tests for okapi tenants', () => {});
    return;
  }

  it(
    `TC195518 - check users-keycloak API for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'users', 'loc'] },
    () => {
      cy.getKeycloakUsersInfo().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body.user.username).to.eq(Cypress.env('diku_login'));
      });
    },
  );

  it(
    `TC195517 - get user capabilities for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'users', 'capabilities', 'loc'] },
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
    { tags: ['sanity', 'fse', 'api', 'users', 'policies', 'loc'] },
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
    { tags: ['sanity', 'fse', 'api', 'users', 'migrations', 'loc'] },
    () => {
      cy.getUserMigrations().then((migrationsResponse) => {
        cy.expect(migrationsResponse.status).to.eq(200);
        cy.expect(migrationsResponse.body.totalRecords).to.not.be.oneOf([null, '']);
      });
    },
  );
});
