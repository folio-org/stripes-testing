Cypress.Commands.add('getOrganizationsApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'organizations/organizations',
      searchParams,
    });
});

Cypress.Commands.add('deleteOrganizationApi', (organizationId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `organizations/organizations/${organizationId}`,
    });
});
