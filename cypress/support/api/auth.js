Cypress.Commands.add('getToken', (username, password) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'bl-users/login',
      body: { username, password },
    })
    .then(({ body, headers }) => {
      const defaultServicePoint = body.servicePointsUser.servicePoints
        .find(({ id }) => id === body.servicePointsUser.defaultServicePointId);

      Cypress.env('token', headers['x-okapi-token']);
      Cypress.env('defaultServicePoint', defaultServicePoint);
    });
});

Cypress.Commands.add('setUserPassword', (userCredentials) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'authn/credentials',
      body: userCredentials,
    });
});
