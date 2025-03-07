Cypress.Commands.add('getBulkEditLogsUsers', () => {
  const url = 'bulk-operations/list-users?query=entityType=USER';
  cy.okapiRequest({
    method: 'GET',
    path: url,
    isDefaultSearchParamsRequired: false,
  });
});
