Cypress.Commands.add('createBlockApi', (block) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'manualblocks',
    body: block,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    Cypress.env('block', body);
  });
});

Cypress.Commands.add('getBlockApi', (userId) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'manualblocks',
    searchParams: {
      query: `userId=${userId}`,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    Cypress.env('blockIds', body.manualblocks);
  });
});

Cypress.Commands.add('deleteBlockApi', (blockId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `manualblocks/${blockId}`,
    isDefaultSearchParamsRequired: false,
  });
});
