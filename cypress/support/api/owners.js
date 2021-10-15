Cypress.Commands.add('createOwnerApi', (owner) => {
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

Cypress.Commands.add('deleteOwnerApi', (ownerId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `owners/${ownerId}`,
    });
});
