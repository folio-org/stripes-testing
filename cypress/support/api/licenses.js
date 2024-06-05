Cypress.Commands.add('getLicensesByStatus', (status) => {
  const UpdatedUrl = encodeURI(
    `licenses/licenses?filters=status.value=${status}sort=name=asc&stats=true&perPage=100&offset=0`,
  );
  cy.okapiRequest({
    method: 'GET',
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});
