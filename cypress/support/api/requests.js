Cypress.Commands.add('getItemRequestsApi', (searchParams) => {
  cy.okapiRequest({
    path: 'circulation/requests',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('requests', body.requests);
  });
});

Cypress.Commands.add('createItemRequestApi', (data) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'circulation/requests',
    body: data,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    Cypress.env('request', body);
    return body;
  });
});

Cypress.Commands.add('getCancellationReasonsApi', (searchParams) => {
  cy.okapiRequest({
    path: 'cancellation-reason-storage/cancellation-reasons',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('cancellationReasons', body.cancellationReasons);
    return body.cancellationReasons;
  });
});

Cypress.Commands.add('addCancellationReasonApi', (data) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'cancellation-reason-storage/cancellation-reasons',
    body: data,
  }).then(({ body }) => {
    Cypress.env('request', body);
    return body;
  });
});

Cypress.Commands.add('deleteCancellationReasonApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `cancellation-reason-storage/cancellation-reasons/${id}`,
  });
});

Cypress.Commands.add('getConfigByName', (config) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'configurations/entries',
    searchParams: {
      query: `(module==SETTINGS and configName==${config})`,
    },
    failOnStatusCode: true,
  }).then(({ body }) => {
    return body;
  });
});
