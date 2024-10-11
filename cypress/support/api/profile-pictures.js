Cypress.Commands.add('getConfigurationsEntry', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'users/configurations/entry',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('updateConfigurationsEntry', (entryId, updatedBody) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `users/configurations/entry/${entryId}`,
    body: updatedBody,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});
