/// <reference types="cypress" />

Cypress.Commands.add('getInstanceIdApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'instance-storage/instances',
      searchParams,
    });
});

Cypress.Commands.add('getInstance', (searchParams) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'search/instances',
    searchParams,
    isDefaultSearchParamsRequired: false
  }).then(({ body }) => {
    return body.instances[0];
  });
});

Cypress.Commands.add('deleteInstanceApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `instance-storage/instances/${id}`,
  });
});

Cypress.Commands.add('getAlternativeTitlesTypes', (searchParams) => cy.okapiRequest({
  method: 'GET',
  path: 'alternative-title-types',
  searchParams,
  isDefaultSearchParamsRequired: false
}).then(({ body }) => body.alternativeTitleTypes));
