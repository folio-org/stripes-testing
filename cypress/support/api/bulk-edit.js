Cypress.Commands.add('getBulkEditLogsUsers', () => {
  const url = 'bulk-operations/list-users?query=entityType=USER';
  cy.okapiRequest({
    method: 'GET',
    path: url,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getBulkEditProfile', (searchParams) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'bulk-operations/profiles',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.content;
  });
});

Cypress.Commands.add('deleteBulkEditProfile', (id, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `bulk-operations/profiles/${id}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});
