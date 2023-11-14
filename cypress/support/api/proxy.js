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

Cypress.Commands.add('getProxyApi', (searchParams) => {
  cy.okapiRequest({
    path: 'proxiesfor',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.proxiesFor;
  });
});
