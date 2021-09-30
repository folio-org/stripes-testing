Cypress.Commands.add('getRequests', (searchParams) => {
  cy
    .okapiRequest({
      path: 'circulation/requests',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('requests', body.requests);
    });
});

Cypress.Commands.add('postRequest', (data) => {
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

Cypress.Commands.add('putRequest', (request) => {
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

Cypress.Commands.add('getCancellationReasons', (searchParams) => {
  cy
    .okapiRequest({
      path: 'cancellation-reason-storage/cancellation-reasons',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('cancellationReasons', body.cancellationReasons);
    });
});
