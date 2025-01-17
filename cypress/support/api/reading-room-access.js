Cypress.Commands.add('getReadingRoom', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'reading-room',
    isDefaultSearchParamsRequired: false,
  });
});
