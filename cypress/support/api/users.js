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

Cypress.Commands.add('getUserGroups', (searchParams) => {
  cy
    .okapiRequest({
      path: 'groups',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('userGroups', body.usergroups);
    });
});

Cypress.Commands.add('getFirstUserGroupId', (searchParams) => {
  cy.okapiRequest({
    path: 'groups',
    searchParams,
  }).then((response) => {
    return response.body.usergroups[0].id;
  });
});

Cypress.Commands.add('deleteUser', (userId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `bl-users/by-id/${userId}`,
    });
});

Cypress.Commands.add('createUserApi', (user) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'users',
      body: user,
    })
    .then(({ body }) => {
      Cypress.env('user', body);
    });
});
