Cypress.Commands.add('postEdgeErm', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('EDGE_HOST')}/erm/license-terms/batch?apikey=${Cypress.env(
      'EDGE_API_KEY',
    )}`,
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
    url: `${Cypress.env('EDGE_HOST')}/prod/rtac/folioRTAC?apikey=${Cypress.env(
      'EDGE_API_KEY',
    )}&mms_id=${instanceId}`,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
      'Content-type': 'application/json',
    },
  });
});

Cypress.Commands.add('postEdgeOrders', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('EDGE_HOST')}/orders/validate?apikey=${Cypress.env(
      'EDGE_API_KEY',
    )}&type=GOBI`,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
    },
    body: ' ',
  });
});

Cypress.Commands.add('postEdgeNcip', (requestBody) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('EDGE_HOST')}/ncip?apikey=${Cypress.env('EDGE_API_KEY')}`,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
    },
    body: requestBody,
  });
});

Cypress.Commands.add('getEdgePatron', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('EDGE_HOST')}/patron/account/${Cypress.env(
      'diku_login',
    )}?apikey=${Cypress.env(
      'EDGE_API_KEY',
    )}&includeLoans=true&includeCharges=true&includeHolds=true`,
    failOnStatusCode: false,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
    },
  });
});

Cypress.Commands.add('getEdgeOai', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('EDGE_HOST')}/oai?apikey=${Cypress.env('EDGE_API_KEY')}&verb=Identify`,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
    },
  });
});

Cypress.Commands.add('postEdgeOrdersGobiIntegration', (requestBody) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('EDGE_HOST')}/orders?type=GOBI&apiKey=${Cypress.env('EDGE_API_KEY')}`,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
      'Content-type': 'application/xml',
    },
    body: requestBody,
  });
});

Cypress.Commands.add('getEdgeDematicAsrItems', (externalStorageId) => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('EDGE_HOST')}/asrService/asr/lookupNewAsrItems/${externalStorageId}?apikey=${Cypress.env('EDGE_API_KEY')}`,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
      'Content-type': 'application/xml',
    },
  });
});

Cypress.Commands.add('getEdgeDematicAsrRequests', (externalStorageId) => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('EDGE_HOST')}/asrService/asr/lookupAsrRequests/${externalStorageId}?apikey=${Cypress.env('EDGE_API_KEY')}`,
    headers: {
      'user-agent': 'FSE_AQA_Suite',
      'Content-type': 'application/xml',
    },
  });
});

Cypress.Commands.add('getAllRemoteStorageConfigurations', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'remote-storage/configurations',
    isDefaultSearchParamsRequired: false,
  });
});
