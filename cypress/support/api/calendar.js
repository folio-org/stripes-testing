Cypress.Commands.add('getCalendars', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'calendar/calendars',
    searchParams: { limit: 2147483647 },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('createCalendar', (body) => {
  cy.okapiRequest({
    path: 'calendar/calendars',
    method: 'POST',
    body,
    failOnStatusCode: false,
  });
});
