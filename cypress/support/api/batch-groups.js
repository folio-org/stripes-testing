Cypress.Commands.add('getBatchGroups', (searchParams) => {
  cy.okapiRequest({
    path: 'batch-groups',
    searchParams,
  }).then((response) => {
    return response.body.batchGroups[0];
  });
});

Cypress.Commands.add('updateBatchGroup', (id, name, description = '') => {
  return cy.okapiRequest({
    method: 'PUT',
    path: `batch-groups/${id}`,
    body: {
      id,
      name,
      description,
    },
  });
});
