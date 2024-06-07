Cypress.Commands.add('getOrganizationsByStatus', (status) => {
  const UpdatedUrl = encodeURI(`organizations/organizations?query=status==${status}&limit=1`);
  cy.okapiRequest({
    method: 'GET',
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});
