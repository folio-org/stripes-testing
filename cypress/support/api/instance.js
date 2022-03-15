/// <reference types="cypress" />

Cypress.Commands.add('getInstanceIdApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'instance-storage/instances',
      searchParams,
    });
});

Cypress.Commands.add('deleteInstanceApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `instance-storage/instances/${id}`,
  });
});
