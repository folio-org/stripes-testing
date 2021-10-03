Cypress.Commands.add('postBlock', (block) => {
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

Cypress.Commands.add('deleteBlock', (blockId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `manualblocks/${blockId}`,
    });
});
