Cypress.Commands.add('getRequestPreference', (searchParams) => {
  cy
    .okapiRequest({
      path: 'request-preference-storage/request-preference',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('requestPreference', body.requestPreference);
    });
});
