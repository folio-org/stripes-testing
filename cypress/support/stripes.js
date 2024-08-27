import Tenant from './tenant';
import Affiliations from './dictionary/affiliations';

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
    isCentral = false,
  }) => {
    const initialParams = new URLSearchParams({ ...searchParams });
    const cypressEnvPath = `${Cypress.env('OKAPI_HOST')}/${path}`;
    if (isDefaultSearchParamsRequired) {
      Object.entries(DEFAULT_SEARCH_PARAMS).forEach(([key, value]) => initialParams.append(key, value));
    }
    const queryString = initialParams.toString();
    const headersToSet = {
      'x-okapi-tenant':
        Cypress.env('ecsEnabled') && Cypress.env('eureka') && isCentral
          ? Affiliations.Consortia
          : Tenant.get(),
      'Content-type': contentTypeHeader,
    };
    if (additionalHeaders) Object.assign(headersToSet, additionalHeaders);
    if (!Cypress.env('rtrAuth') && !Cypress.env('eureka')) {
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
