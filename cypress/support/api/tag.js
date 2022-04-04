import uuid from 'uuid';

Cypress.Commands.add('createTagApi', (tag) => {
  const { tagId = uuid() } = tag;

  cy.okapiRequest({
    method: 'POST',
    path: 'tags',
    body: {
      id: tagId,
      ...tag,
    }
  })
    .then(() => {
      cy.wrap(tagId).as('tagId');
    });
  return cy.get('@tagId');
});

Cypress.Commands.add('deleteTagApi', (tagId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `tags/${tagId}`,
  });
});
