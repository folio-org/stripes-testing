Cypress.Commands.add('getBatchGroups', (searchParams) => {
  cy.okapiRequest({
    path: 'batch-groups',
    searchParams,
  }).then((response) => {
    return response.body.batchGroups[0];
  });
});
