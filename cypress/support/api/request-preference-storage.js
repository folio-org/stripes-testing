Cypress.Commands.add('getRequestPreference', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'request-preference-storage/request-preference',
      searchParams,
    });
});
