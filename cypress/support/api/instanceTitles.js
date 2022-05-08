Cypress.Commands.add('getAlternativeTitlesTypes', (searchParams) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'alternative-title-types',
    searchParams,
    isDefaultSearchParamsRequired: false
  }).then(({ body }) => {
    return body.alternativeTitleTypes;
  });
});
