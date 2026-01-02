Cypress.Commands.add('getTimers', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'scheduler/timers?limit=50',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});
