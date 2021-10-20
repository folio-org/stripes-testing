Cypress.Commands.add('createBlockApi', (block) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'manualblocks',
      body: block,
    })
    .then(({ body }) => {
      Cypress.env('block', body);
    });
});

Cypress.Commands.add('deleteBlockApi', (blockId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `manualblocks/${blockId}`,
    });
});
