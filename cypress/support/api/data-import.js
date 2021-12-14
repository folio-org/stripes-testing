Cypress.Commands.add('getJobLogs', (searchParams) => {
  cy
    .okapiRequest({
      path: 'metadata-provider/jobExecutions',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('jobLogs', body.jobExecutions);
    });
});
