Cypress.Commands.add('getLdpTables', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'ldp/db/tables',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getLdpConfig', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'ldp/config',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getLdpDbVersion', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'ldp/db/version',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getLdpDbUpdates', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'ldp/db/updates',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getLdpDbProcesses', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'ldp/db/processes',
    isDefaultSearchParamsRequired: false,
  });
});
