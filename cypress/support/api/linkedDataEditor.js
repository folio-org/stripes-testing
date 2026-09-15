Cypress.Commands.add('getLinkedDataWorks', (query) => {
  return cy.okapiRequest({
    method: 'GET',
    path: 'search/linked-data/works',
    isDefaultSearchParamsRequired: false,
    searchParams: {
      limit: 1,
      query,
    },
  });
});

Cypress.Commands.add('setPrefferedProfileForUser', () => {
  // id is hardcoded as 3 on purpose - API will automatically identify the user ID from the folioAccessToken cookie.
  const prefferedProfile = {
    id: 3,
    resourceType: 'http://bibfra.me/vocab/lite/Instance',
  };
  cy.okapiRequest({
    method: 'POST',
    path: 'linked-data/profile/preferred',
    body: prefferedProfile,
  });
});
