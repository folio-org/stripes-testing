Cypress.Commands.add('getConfigForTenantByName', (configName) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'configurations/entries',
    searchParams: {
      query: `(module==ORG and configName==${configName})`,
    },
    failOnStatusCode: true,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.configs[0];
  });
});

Cypress.Commands.add('updateConfigForTenantById', (configId, body) => {
  return cy.okapiRequest({
    method: 'PUT',
    path: `configurations/entries/${configId}`,
    body,
    failOnStatusCode: true,
    isDefaultSearchParamsRequired: false,
  });
});
