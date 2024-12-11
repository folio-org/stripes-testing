import { adminUsernames } from '../dictionary/affiliations';
import Tenant from '../tenant';

Cypress.Commands.add(
  'getToken',
  (username, password, isCentral = false, getServicePoint = true) => {
    let pathToSet = 'bl-users/login-with-expiry';
    if (!Cypress.env('rtrAuth')) {
      pathToSet = 'bl-users/login';
    }
    if (Cypress.env('eureka')) {
      cy.clearCookies({ domain: null });
      cy.okapiRequest({
        method: 'POST',
        path: 'authn/login',
        body: { username, password },
        isDefaultSearchParamsRequired: false,
        isCentral,
      }).then(() => {
        //   // cy.wait(5000);
        //   // cy.okapiRequest({
        //   //   path: 'users-keycloak/_self',
        //   //   headers: {
        //   //     'x-okapi-token': cy.getCookie('folioAccessToken'),
        //   //   },
        //   //   isDefaultSearchParamsRequired: false,
        //   // }).then(({ body }) => {
        //   //   const defaultServicePoint = body.servicePointsUser.servicePoints.find(
        //   //     ({ id }) => id === body.servicePointsUser.defaultServicePointId,
        //   //   );
        //   //   Cypress.env('defaultServicePoint', defaultServicePoint);
        //   // });
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
  },
);

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
  // reset tenant to default!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  cy.resetTenant();
  if (Cypress.env('ecsEnabled') && Cypress.env('eureka')) {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'), false);
  } else {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  }
  // reset tenant to member
  cy.setTenant(Cypress.env('MEMBER_TENANT_ID'));
});

Cypress.Commands.add('getCollegeAdminToken', () => {
  cy.getToken(adminUsernames.college, Cypress.env('diku_password'));
});

Cypress.Commands.add('getUniversityAdminToken', () => {
  cy.getToken(adminUsernames.university, Cypress.env('diku_password'));
});

Cypress.Commands.add('getUserToken', (username, password) => {
  // reset tenant to default!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  cy.resetTenant();
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
    // set tenant to member
    cy.setTenant(Cypress.env('MEMBER_TENANT_ID'));
  });
});

Cypress.Commands.add('logoutViaApi', () => {
  // reset tenant to default!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  cy.resetTenant();
  cy.okapiRequest({
    method: 'POST',
    path: 'authn/logout',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
  // set tenant to member
  cy.setTenant(Cypress.env('MEMBER_TENANT_ID'));
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
