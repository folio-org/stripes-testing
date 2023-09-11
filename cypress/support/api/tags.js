Cypress.Commands.add('getTagsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'tags',
    searchParams,
  });
});

Cypress.Commands.add('createTagApi', (tag) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'tags',
    body: {
      ...tag,
    },
  }).then((response) => {
    return response.body.id;
  });
});

Cypress.Commands.add('deleteTagApi', (tagId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `tags/${tagId}`,
  });
});
