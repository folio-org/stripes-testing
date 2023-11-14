Cypress.Commands.add('getToken', (username, password) => {
  let pathToSet = 'bl-users/login-with-expiry';
  if (!Cypress.env('rtrAuth')) {
    pathToSet = 'bl-users/login';
  }
  cy.okapiRequest({
    method: 'POST',
    path: pathToSet,
    body: { username, password },
    isDefaultSearchParamsRequired: false,
  }).then(({ body, headers }) => {
    const defaultServicePoint = body.servicePointsUser.servicePoints.find(
      ({ id }) => id === body.servicePointsUser.defaultServicePointId,
    );
    if (!Cypress.env('rtrAuth')) {
      Cypress.env('token', headers['x-okapi-token']);
    }

    Cypress.env('defaultServicePoint', defaultServicePoint);
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
