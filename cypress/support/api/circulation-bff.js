Cypress.Commands.add('getCirculationBffAllowerServicePoints', () => {
  const url = 'circulation-bff/requests/allowed-service-points';
  cy.okapiRequest({
    method: 'GET',
    path: url,
    isDefaultSearchParamsRequired: false,
  });
});
