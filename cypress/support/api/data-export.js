Cypress.Commands.add('dataExportGetJobByStatus', (jobStatus) => {
  return cy.okapiRequest({
    path: `data-export/job-executions?limit=1&query=status==${jobStatus}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('runDataExportAuthorityDeleted', (query) => {
  return cy
    .okapiRequest({
      method: 'POST',
      path: 'data-export/export-authority-deleted',
      body: {
        offset: 0,
        limit: 2000,
        query,
      },
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response);
});

Cypress.Commands.add('createDataExportCustomMappingProfile', (body) => {
  return cy
    .okapiRequest({
      method: 'POST',
      path: 'data-export/mapping-profiles',
      body,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response.body);
});
