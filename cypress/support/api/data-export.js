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

Cypress.Commands.add('getDataExportMappingProfiles', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'data-export/mapping-profiles',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body.mappingProfiles;
    });
});

Cypress.Commands.add('getDataExportJobProfile', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'data-export/job-profiles',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body.jobProfiles[0];
    });
});

Cypress.Commands.add('updateDataExportJobProfile', (jobProfileId, body) => {
  return cy
    .okapiRequest({
      method: 'PUT',
      path: `data-export/job-profiles/${jobProfileId}`,
      body,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body;
    });
});

Cypress.Commands.add('deleteDataExportJobExecutionFromLogs', (jobExecutionId) => {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `data-export/job-executions/${jobExecutionId}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('editFieldMappingProfile', (profileId, body) => {
  return cy
    .okapiRequest({
      method: 'PUT',
      path: `data-export/mapping-profiles/${profileId}`,
      body,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body;
    });
});

Cypress.Commands.add('downloadDataExportRecordViaApi', (recordId, idType, suppressOptions = {}) => {
  const searchParams = { idType, ...suppressOptions };

  return cy
    .okapiRequest({
      method: 'GET',
      path: `data-export/download-record/${recordId}`,
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => {
      return response.body;
    });
});

Cypress.Commands.add('configureDataExportFileLimit', (key, value) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'data-export/configuration',
    body: {
      key,
      value: value.toString(),
    },
    isDefaultSearchParamsRequired: false,
  });
});
