import Tenant from './tenant';

const DEFAULT_SEARCH_PARAMS = {
  limit: 1000,
  query: 'cql.allRecords=1',
};

Cypress.Commands.add(
  'okapiRequest',
  ({
    method = 'GET',
    path,
    searchParams = {},
    body,
    isDefaultSearchParamsRequired = true,
    contentTypeHeader = 'application/json',
    failOnStatusCode = false,
  }) => {
    const initialParams = new URLSearchParams({ ...searchParams });
    const cypressEnvPath = `${Cypress.env('OKAPI_HOST')}/${path}`;
    if (isDefaultSearchParamsRequired) {
      Object.entries(DEFAULT_SEARCH_PARAMS).forEach(([key, value]) => initialParams.append(key, value));
    }
    const queryString = initialParams.toString();
    const headersToSet = {
      'x-okapi-tenant': Tenant.get(),
      'Content-type': contentTypeHeader,
    };
    if (!Cypress.env('rtrAuth')) {
      headersToSet['x-okapi-token'] = Cypress.env('token');
    }
    cy.request({
      method,
      url: queryString ? `${cypressEnvPath}?${queryString}` : cypressEnvPath,
      headers: headersToSet,
      body,
      failOnStatusCode,
    });
  },
);
