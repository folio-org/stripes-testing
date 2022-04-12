import uuid from 'uuid';

Cypress.Commands.add('getTagsApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'tags',
      searchParams,
    });
});

Cypress.Commands.add('createTagApi', (tag) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'tags',
    body: {
      id: uuid(),
      ...tag,
    }
  })
    .then(({ body }) => {
      Cypress.env('tagId', body.id);
    });
});

Cypress.Commands.add('getTagIdApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'tags',
      searchParams,
    });
});

Cypress.Commands.add('deleteTagApi', (tagId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `tags/${tagId}`,
  });
});
