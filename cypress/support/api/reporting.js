Cypress.Commands.add('getLdpTables', ({ failOnStatusCode = true } = {}) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'ldp/db/tables',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode,
  });
});

Cypress.Commands.add('getLdpColumns', (schema, table, { failOnStatusCode = true } = {}) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'ldp/db/columns',
    searchParams: { schema, table },
    isDefaultSearchParamsRequired: false,
    failOnStatusCode,
  });
});

Cypress.Commands.add('postLdpQuery', (body, { failOnStatusCode = true } = {}) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'ldp/db/query',
    body,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode,
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
