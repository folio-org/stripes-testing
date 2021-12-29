Cypress.Commands.add('getTagsApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'tags',
      searchParams,
    });
});
