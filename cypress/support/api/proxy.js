Cypress.Commands.add('createProxyApi', (proxy) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'proxiesfor',
    body: proxy,
  }).then(({ body }) => {
    Cypress.env('proxy', body);
  });
});

Cypress.Commands.add('deleteProxyApi', (proxyId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `proxiesfor/${proxyId}`,
  });
});
