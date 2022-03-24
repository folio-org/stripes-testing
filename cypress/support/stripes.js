const DEFAULT_SEARCH_PARAMS = {
  limit: 1000,
  query: 'cql.allRecords=1',
};

Cypress.Commands.add('okapiRequest', ({ method = 'GET',
  path,
  searchParams = {},
  body,
  isDefaultSearchParamsRequired = true }) => {
  const initialParams = new URLSearchParams({ ...searchParams });
  if (isDefaultSearchParamsRequired) {
    Object.entries(DEFAULT_SEARCH_PARAMS).forEach(([key, value]) => initialParams.append(key, value));
  }
  const queryString = (initialParams).toString();
  cy.request({
    method,
    url: queryString ? `${Cypress.env('OKAPI_HOST')}/${path}?${queryString}` : `${Cypress.env('OKAPI_HOST')}/${path}`,
    headers: {
      'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
      'x-okapi-token': Cypress.env('token'),
    },
    body,
  });
});
