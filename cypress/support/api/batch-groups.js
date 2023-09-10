Cypress.Commands.add('getBatchGroups', (searchParams) => {
  cy.okapiRequest({
    path: 'batch-groups',
    searchParams,
  }).then((response) => {
    return response.body.batchGroups[0];
  });
});
export default {
  createBatchGroupViaApi: (batchGroup) => cy
    .okapiRequest({
      method: 'POST',
      path: 'batch-groups',
      body: batchGroup,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response.body),
};
