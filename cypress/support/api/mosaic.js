Cypress.Commands.add('getMosaicValidate', () => {
  return cy.okapiRequest({
    method: 'GET',
    path: 'mosaic/validate',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getMosaicConfiguration', () => {
  return cy.okapiRequest({
    method: 'GET',
    path: 'mosaic/configuration',
    isDefaultSearchParamsRequired: false,
  });
});
