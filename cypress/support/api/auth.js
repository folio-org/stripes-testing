Cypress.Commands.add('getToken', (username, password) => {
  cy.request({
    method: 'POST',
    url: 'bl-users/login-with-expiry',
    body: { username, password },
    isDefaultSearchParamsRequired: false,
  }).then(({ body, headers }) => {
    const defaultServicePoint = body.servicePointsUser.servicePoints.find(
      ({ id }) => id === body.servicePointsUser.defaultServicePointId,
    );

    const cookieString = headers['set-cookie'][0];
    const token = cookieString.split(';')[0]; // Извлекаем только значение куки

    Cypress.env('token', token);
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
