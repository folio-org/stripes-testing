import { DEFAULT_LOCALE_OBJECT } from '../constants';

Cypress.Commands.add('getConfigForTenantByName', (configName) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'settings/entries',
    searchParams: {
      query: `(scope==stripes-core.prefs.manage and key==${configName})`,
    },
    failOnStatusCode: true,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.items.length ? body.items[0] : null;
  });
});

Cypress.Commands.add('updateConfigForTenantById', (configId, body) => {
  return cy.okapiRequest({
    method: 'PUT',
    path: `settings/entries/${configId}`,
    body,
    failOnStatusCode: true,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getApplicationsForTenantApi', (tenantName, idOnly = true) => {
  cy.okapiRequest({
    path: `entitlements/${tenantName}/applications?limit=50`,
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    if (idOnly) return response.body.applicationDescriptors.map((descriptor) => descriptor.id);
    else return response;
  });
});

Cypress.Commands.add('getModUsersVersion', () => {
  if (!Cypress.env('MOD_USERS_VERSION')) {
    return cy.getApplicationsForTenantApi(Cypress.env('OKAPI_TENANT'), false).then(({ body }) => {
      const moduleIds = [];
      body.applicationDescriptors.forEach((app) => {
        moduleIds.push(...app.modules);
      });
      const modUsersId = moduleIds.find((m) => String(m.name).startsWith('mod-users')).id;
      Cypress.env('MOD_USERS_VERSION', modUsersId);
      return cy.wrap(modUsersId);
    });
  } else {
    return Cypress.env('MOD_USERS_VERSION');
  }
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

Cypress.Commands.add('getTenantLocaleApi', () => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: 'locale',
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => body);
});

Cypress.Commands.add('setTenantLocaleApi', (localeBody) => {
  return cy.okapiRequest({
    method: 'PUT',
    path: 'locale',
    isDefaultSearchParamsRequired: false,
    body: localeBody,
  });
});

Cypress.Commands.add('setDefaultLocaleApi', () => {
  return cy.okapiRequest({
    method: 'PUT',
    path: 'locale',
    isDefaultSearchParamsRequired: false,
    body: DEFAULT_LOCALE_OBJECT,
  });
});
