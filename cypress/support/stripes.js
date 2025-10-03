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
    timeout = 30000,
    retries = 2,
    retryDelay = 2000,
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
      timeout,
    };
    if (encoding) {
      requestObject = { ...requestObject, encoding };
    }
    const maxAttempts = Math.max(retries, 0) + 1;
    const makeRequest = (attempt = 1) => cy.request(requestObject).then(
      (response) => response,
      (error) => {
        if (attempt >= maxAttempts) {
          throw error;
        }
        return cy.wait(retryDelay).then(() => makeRequest(attempt + 1));
      },
    );

    return makeRequest();
  },
);
