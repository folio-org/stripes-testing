Cypress.Commands.add('getOrganizationsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'organizations/organizations',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('organizations', body.organizations);
    });
});

Cypress.Commands.add('deleteOrganizationApi', (organizationId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `organizations/organizations/${organizationId}`,
    });
});
