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

Cypress.Commands.add('createAlternativeTitleTypes', (alternativeTitleType) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'alternative-title-types',
    body: alternativeTitleType,
  }).then(({ body }) => body.id);
});

Cypress.Commands.add('deleteAlternativeTitleTypes', (alternativeTitleTypeID) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `alternative-title-types/${alternativeTitleTypeID}`,
  });
});
