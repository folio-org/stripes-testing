Cypress.Commands.add('getEHoldingsCustomLabelsViaAPI', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'eholdings/custom-labels',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.data;
  });
});
