Cypress.Commands.add('postOwner', (owner) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'owners',
      body: owner,
    })
    .then(({ body }) => {
      Cypress.env('owner', body);
    });
});

Cypress.Commands.add('deleteOwner', (ownerId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `owners/${ownerId}`,
    });
});
