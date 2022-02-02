Cypress.Commands.add('getBatchGroups', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'batch-groups',
      searchParams,
    });
});
