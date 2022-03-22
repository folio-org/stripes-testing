Cypress.Commands.add('getRequestPreference', (searchParams) => {
  cy
    .okapiRequest({
      path: 'request-preference-storage/request-preference',
      searchParams,
    });
});
