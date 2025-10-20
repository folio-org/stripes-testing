/* eslint-disable consistent-return */
import Tenant from '../tenant';
import { adminUsernames } from '../dictionary/affiliations';

Cypress.Commands.add('getToken', (username, password, getServicePoint = false) => {
  let pathToSet = 'bl-users/login-with-expiry';
  if (!Cypress.env('rtrAuth')) {
    pathToSet = 'bl-users/login';
  }
  if (Cypress.env('eureka')) {
    cy.okapiRequest({
      method: 'POST',
      path: 'authn/login',
      body: { username, password },
      isDefaultSearchParamsRequired: false,
    });
  } else {
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
  }
});

Cypress.Commands.add('setUserPassword', (userCredentials, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'authn/credentials',
    body: userCredentials,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});

Cypress.Commands.add('getAdminToken', () => {
  cy.clearCookies({ domain: null });
  cy.wait(2000); // Wait for cookies to be cleared
  cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
});

Cypress.Commands.add('getCollegeAdminToken', () => {
  cy.getToken(adminUsernames.college, Cypress.env('diku_password'));
});

Cypress.Commands.add('getUniversityAdminToken', () => {
  cy.getToken(adminUsernames.university, Cypress.env('diku_password'));
});

Cypress.Commands.add('getUserTokenOfAdminUser', () => {
  cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
});

Cypress.Commands.add('getUserToken', (username, password) => {
  let pathToSet = 'bl-users/login-with-expiry';
  if (!Cypress.env('rtrAuth')) {
    pathToSet = 'bl-users/login';
  }
  if (Cypress.env('eureka')) {
    pathToSet = 'authn/login';
  }
  cy.okapiRequest({
    method: 'POST',
    path: pathToSet,
    body: { username, password },
    isDefaultSearchParamsRequired: false,
  }).then(({ headers }) => {
    if (!Cypress.env('rtrAuth') && !Cypress.env('eureka')) {
      Cypress.env('token', headers['x-okapi-token']);
    }
  });
});

Cypress.Commands.add('logoutViaApi', () => {
  cy.okapiRequest({
    method: 'POST',
    path: 'authn/logout',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('updateCredentials', (username, oldPassword, newPassword, userId) => {
  const body = userId
    ? { username, password: oldPassword, newPassword, userId }
    : { username, password: oldPassword, newPassword };
  return cy.okapiRequest({
    method: 'POST',
    path: 'authn/update',
    body,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});

// eslint-disable-next-line no-unused-vars
Cypress.Commands.add('waitForAuthRefresh', (callback, timeout = 20_000) => {
  cy.intercept('POST', '/authn/refresh').as('/authn/refresh');
  callback();
  // cy.wait('@/authn/refresh', { timeout }).its('response.statusCode').should('eq', 201);
  cy.wait(2000);
});

Cypress.Commands.add('getConsortiaStatus', () => {
  cy.okapiRequest({
    path: 'consortia-configuration',
    failOnStatusCode: false,
    isDefaultSearchParamsRequired: false,
  }).then(({ body, status }) => {
    cy.log('getConsortiaStatus', body, status);
    if (status === 200) {
      return cy.wrap({ centralTenantId: body.centralTenantId, isConsortia: true });
    }
    return cy.wrap({ centralTenantId: null, isConsortia: false });
  });
});

Cypress.Commands.add('ifConsortia', (condition, callback) => {
  return cy.wrap(Cypress.env('isConsortia')).then((isConsortiaStatus) => {
    if (isConsortiaStatus === undefined) {
      cy.getConsortiaStatus().then(({ isConsortia }) => {
        Cypress.env('isConsortia', isConsortia);
        if (condition === isConsortia) {
          return cy.wrap(callback());
        }
      });
    } else if (condition === isConsortiaStatus) {
      return cy.wrap(callback());
    }
  });
});

Cypress.Commands.add('getLocateGuestToken', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_OKAPI_HOST')}/opac-auth/guest-token`,
    headers: {
      'x-okapi-tenant': `${Cypress.env('LOCATE_TENANT')}`,
      'Content-type': 'application/json',
    },
  }).then(({ headers }) => {
    Cypress.env('locate_guest_token', headers['x-okapi-token']);
  });
});
