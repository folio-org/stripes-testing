Cypress.Commands.add('postProxy', (proxy) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'proxiesfor',
      body: proxy,
    })
    .then(({ body }) => {
      Cypress.env('proxy', body);
    });
});

Cypress.Commands.add('deleteProxy', (proxyId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `proxiesfor/${proxyId}`,
    });
});







