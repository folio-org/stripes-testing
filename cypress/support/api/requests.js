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
      return body;
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
      return body;
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
      return body.cancellationReasons;
    });
});

Cypress.Commands.add('deleteItemRequestApi', (requestId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `circulation/requests/${requestId}`,
    })
    .then((res) => {
      return cy.wrap(res);
    });
});

// Creates a request for any item from the given instance ID
Cypress.Commands.add('createRequest', (data) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'circulation/requests/instances',
      body: data,
    })
    .then(({ body }) => {
      return body;
    });
});
