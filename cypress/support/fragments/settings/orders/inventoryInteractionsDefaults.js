Cypress.Commands.add('setConfigurationInventoryInteractions', (body) => {
  cy.okapiRequest({
    method: 'PUT',
    path: 'configurations/entries/944ceb5a-1d36-4e7d-894f-eb4bfbacc265',
    body,
  });
});

