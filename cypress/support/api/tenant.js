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

Cypress.Commands.add('getApplicationsForTenantApi', (tenantName, idOnly = true) => {
  cy.okapiRequest({
    path: `entitlements/${tenantName}/applications`,
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    if (idOnly) return response.body.applicationDescriptors.map((descriptor) => descriptor.id);
    else return response;
  });
});

Cypress.Commands.add(
  'getInterfacesForTenantProxyApi',
  (tenantName, { isFull, type } = { isFull: true }) => {
    const params = type ? `?full=${isFull}&type=${type}` : `?full=${isFull}`;
    return cy.okapiRequest({
      path: `_/proxy/tenants/${tenantName}/interfaces${params}`,
      isDefaultSearchParamsRequired: false,
    });
  },
);
