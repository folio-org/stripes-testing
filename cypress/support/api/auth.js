import Tenant from '../tenant';
import { adminUsernames } from '../dictionary/affiliations';

Cypress.Commands.add('getToken', (username, password, getServicePoint = true) => {
  let pathToSet = 'bl-users/login-with-expiry';
  if (!Cypress.env('rtrAuth')) {
    pathToSet = 'bl-users/login';
  }
  cy.okapiRequest({
    method: 'POST',
    path: pathToSet,
    body: { username, password },
    isDefaultSearchParamsRequired: false,
    headers: {
      'x-okapi-tenant': Tenant.get(),
    },
  }).then(({ body, headers }) => {
    if (getServicePoint) {
      const defaultServicePoint = body.servicePointsUser.servicePoints.find(
        ({ id }) => id === body.servicePointsUser.defaultServicePointId,
      );
      Cypress.env('defaultServicePoint', defaultServicePoint);
    }

    if (!Cypress.env('rtrAuth')) {
      Cypress.env('token', headers['x-okapi-token']);
    }
  });
});

Cypress.Commands.add('setUserPassword', (userCredentials) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'authn/credentials',
    body: userCredentials,
  });
});

Cypress.Commands.add('getAdminToken', () => {
  cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
});

Cypress.Commands.add('getCollegeAdminToken', () => {
  cy.getToken(adminUsernames.college, Cypress.env('diku_password'));
});

Cypress.Commands.add('getUniversityAdminToken', () => {
  cy.getToken(adminUsernames.university, Cypress.env('diku_password'));
});

Cypress.Commands.add('getUserToken', (username, password) => {
  let pathToSet = 'bl-users/login-with-expiry';
  if (!Cypress.env('rtrAuth')) {
    pathToSet = 'bl-users/login';
  }
  cy.okapiRequest({
    method: 'POST',
    path: pathToSet,
    body: { username, password },
    isDefaultSearchParamsRequired: false,
  }).then(({ headers }) => {
    if (!Cypress.env('rtrAuth')) {
      Cypress.env('token', headers['x-okapi-token']);
    }
  });
});

Cypress.Commands.add('waitForAuthRefresh', (callback, timeout = 30_000) => {
  cy.intercept('POST', '/authn/refresh').as('/authn/refresh');
  callback();
  cy.wait('@/authn/refresh', { timeout }).its('response.statusCode').should('eq', 201);
  cy.wait(500);
});
