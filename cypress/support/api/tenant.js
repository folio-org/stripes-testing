import { DEFAULT_LOCALE_STRING } from '../constants';

const localeConfigName = 'localeSettings';

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
    return body.configs.length ? body.configs[0] : null;
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
    path: `entitlements/${tenantName}/applications?limit=200`,
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    if (idOnly) return response.body.applicationDescriptors.map((descriptor) => descriptor.id);
    else return response;
  });
});

Cypress.Commands.add(
  'getInterfacesForTenantProxyApi',
  (tenantName, { full, type } = { full: true }) => {
    const params = type ? `?full=${full}&type=${type}` : `?full=${full}`;
    return cy.okapiRequest({
      path: `_/proxy/tenants/${tenantName}/interfaces${params}`,
      isDefaultSearchParamsRequired: false,
    });
  },
);

Cypress.Commands.add('getModulesForTenantProxyApi', (tenantName, params = null) => {
  return cy.okapiRequest({
    path: `_/proxy/tenants/${tenantName}/modules`,
    isDefaultSearchParamsRequired: false,
    searchParams: params,
  });
});

Cypress.Commands.add('getEntitlementsApi', (params = { limit: 100 }) => {
  return cy.okapiRequest({
    path: 'entitlements',
    isDefaultSearchParamsRequired: false,
    searchParams: params,
  });
});

Cypress.Commands.add('getTenantsApi', () => {
  return cy.okapiRequest({
    path: 'tenants?limit=200',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('setDefaultLocaleApi', () => {
  cy.getConfigForTenantByName(localeConfigName).then((config) => {
    if (config) {
      const updatedConfig = { ...config };
      updatedConfig.value = DEFAULT_LOCALE_STRING;
      cy.updateConfigForTenantById(config.id, updatedConfig);
    }
  });
});
