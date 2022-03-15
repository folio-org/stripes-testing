/// <reference types="cypress" />

Cypress.Commands.add('getInstanceIdApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'instance-storage/instances',
      searchParams,
    });
});

Cypress.Commands.add('getInstances', (searchParams) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'search/instances',
    searchParams
  }).then(({ body }) => {
    Cypress.env('instances', body.instances);
  });
});

Cypress.Commands.add('deleteInstanceApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `instance-storage/instances/${id}`,
  });
});
