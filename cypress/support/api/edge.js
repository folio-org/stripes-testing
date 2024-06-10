Cypress.Commands.add('postEdgeErm', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('EDGE_HOST')}/erm/license-terms/batch?apikey=${Cypress.env('EDGE_API_KEY')}`,
    body: JSON.stringify({ ids: ['58251-22551'] }),
    headers: {
      'user-agent': 'FSE_AQA_Suite',
      'Content-type': 'application/json',
    },
  });
});
