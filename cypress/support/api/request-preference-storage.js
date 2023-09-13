Cypress.Commands.add('getRequestPreference', (searchParams) => {
  return cy.okapiRequest({
    path: 'request-preference-storage/request-preference',
    searchParams,
    isDefaultSearchParamsRequired: false,
  });
});
Cypress.Commands.add('createRequestPreference', (requestPreferencePayload) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'request-preference-storage/request-preference',
    body: requestPreferencePayload,
    isDefaultSearchParamsRequired: false,
  });
});
Cypress.Commands.add('updateRequestPreference', (id, requestPreferencePayload) => {
  return cy.okapiRequest({
    method: 'PUT',
    path: `request-preference-storage/request-preference/${id}`,
    body: requestPreferencePayload,
    isDefaultSearchParamsRequired: false,
  });
});
