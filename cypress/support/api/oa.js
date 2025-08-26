Cypress.Commands.add('getPublicationRequestByTerm', (searchParams) => {
  const url = 'oa/publicationRequest';
  cy.okapiRequest({
    method: 'GET',
    path: url,
    searchParams,
    isDefaultSearchParamsRequired: false,
  });
});
