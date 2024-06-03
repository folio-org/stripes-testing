Cypress.Commands.add('dataExportGetJobByStatus', (jobStatus) => {
  return cy.okapiRequest({
    path: `data-export/job-executions?limit=1&query=status==${jobStatus}`,
    isDefaultSearchParamsRequired: false,
  });
});
