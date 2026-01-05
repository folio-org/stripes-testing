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
    failOnStatusCode = true,
    additionalHeaders = null,
    encoding = null,
    customTimeout = null,
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
    if (additionalHeaders) Object.assign(headersToSet, additionalHeaders);
    if (!Cypress.env('rtrAuth') && !Cypress.env('eureka')) {
      headersToSet['x-okapi-token'] = Cypress.env('token');
    }
    let requestObject = {
      method,
      url: queryString ? `${cypressEnvPath}?${queryString}` : cypressEnvPath,
      headers: headersToSet,
      body,
      failOnStatusCode,
    };
    if (encoding) {
      requestObject = { ...requestObject, encoding };
    }
    if (customTimeout) requestObject = { ...requestObject, timeout: customTimeout };
    cy.request(requestObject);
  },
);
