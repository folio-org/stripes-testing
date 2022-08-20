Cypress.Commands.add('getRequestPreference', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'request-preference-storage/request-preference',
      searchParams,
    });
});
Cypress.Commands.add('createRequestPreference', (requestPreferencePayload) => {
  return cy
    .okapiRequest({
      method: 'POST',
      path: 'request-preference-storage/request-preference',
      body: requestPreferencePayload,
      isDefaultSearchParamsRequired: false,
    });
});
