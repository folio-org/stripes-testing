Cypress.Commands.add('getInstance', (searchParams) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'search/instances',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.instances[0];
  });
});

Cypress.Commands.add('getAlternativeTitlesTypes', (searchParams) => cy
  .okapiRequest({
    method: 'GET',
    path: 'alternative-title-types',
    searchParams,
    isDefaultSearchParamsRequired: false,
  })
  .then(({ body }) => body.alternativeTitleTypes));
