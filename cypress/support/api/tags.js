Cypress.Commands.add('getTagsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'tags',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('tags', body.tags);
    });
});
