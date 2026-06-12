Cypress.Commands.add('getReadingRoom', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'reading-room',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('assignReadingRoomAccess', (patronId, body) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `reading-room-patron-permission/${patronId}`,
    body,
    isDefaultSearchParamsRequired: false,
  });
});
