Cypress.Commands.add('getExportManagerJobByStatus', (status) => {
  cy.okapiRequest({
    method: 'GET',
    path: `data-export-spring/jobs?limit=1&offset=0&query=status==${status}`,
    isDefaultSearchParamsRequired: false,
  });
});
