Cypress.Commands.add('getTimers', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'scheduler/timers?limit=50',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('createTimerApi', (timerBody) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'scheduler/timers',
    body: timerBody,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('updateTimerApi', (timerId, updatedTimerBody) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `scheduler/timers/${timerId}`,
    body: updatedTimerBody,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('deleteTimerApi', (timerId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `scheduler/timers/${timerId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});
