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

Cypress.Commands.add('getEdgeRtac', (instanceId) => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('EDGE_HOST')}/prod/rtac/folioRTAC?apikey=${Cypress.env('EDGE_API_KEY')}&mms_id=${instanceId}`,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
      'Content-type': 'application/json',
    },
  });
});
