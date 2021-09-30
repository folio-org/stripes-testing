Cypress.Commands.add('getServicePoints', (searchParams) => {
  cy
    .okapiRequest({
      path: 'service-points',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('servicePoints', body.servicepoints);
    });
});
