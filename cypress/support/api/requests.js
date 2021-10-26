Cypress.Commands.add('getItemRequestsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'circulation/requests',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('requests', body.requests);
    });
});

Cypress.Commands.add('createItemRequestApi', (data) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'circulation/requests',
      body: data,
    })
    .then(({ body }) => {
      Cypress.env('request', body);
    });
});

Cypress.Commands.add('changeItemRequestApi', (request) => {
  cy
    .okapiRequest({
      method: 'PUT',
      path: `circulation/requests/${request.id}`,
      body: request,
    })
    .then(({ body }) => {
      Cypress.env('request', body);
    });
});

Cypress.Commands.add('getCancellationReasonsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'cancellation-reason-storage/cancellation-reasons',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('cancellationReasons', body.cancellationReasons);
    });
});
