Cypress.Commands.add('deleteOrganizationApi', (organizationId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `organizations/organizations/${organizationId}`,
    });
});

Cypress.Commands.add('getOrganizationApi', (searchParams) => {
  cy.okapiRequest({
    path: 'organizations/organizations',
    searchParams
  }).then(response => { return response.body.organizations[0]; });
});
