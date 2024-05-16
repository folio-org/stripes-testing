Cypress.Commands.add('getEHoldingsCustomLabelsViaAPI', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'eholdings/custom-labels',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.data;
  });
});

Cypress.Commands.add('getEHoldingsTitlesViaAPI', (titleName) => {
  cy.okapiRequest({
    method: 'GET',
    path: `eholdings/titles?page=1&filter[name]=${titleName}&count=1`,
    isDefaultSearchParamsRequired: false,
  });
});
