const DEFAULT_SEARCH_PARAMS = {
  limit: 1000,
  query: 'cql.allRecords=1',
};

Cypress.Commands.add('okapiRequest', ({
  method = 'GET',
  path,
  searchParams = {},
  body,
}) => {
  const queryString = (new URLSearchParams({
    ...DEFAULT_SEARCH_PARAMS,
    ...searchParams,
  })).toString();

  cy.request({
    method,
    url: `${Cypress.env('OKAPI_HOST')}/${path}?${queryString}`,
    headers: {
      'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
      'x-okapi-token': Cypress.env('token'),
    },
    body,
  });
});
