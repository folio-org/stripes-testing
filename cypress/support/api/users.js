Cypress.Commands.add('getUsers', (searchParams) => {
  cy
    .okapiRequest({
      path: 'users',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('users', body.users);
    });
});

Cypress.Commands.add('getUserServicePoints', (userId) => {
  cy
    .okapiRequest({
      path: 'service-points-users',
      searchParams: {
        query: `(userId==${userId})`,
      },
    })
    .then(({ body }) => {
      Cypress.env('userServicePoints', body.servicePointsUsers);
    });
});
