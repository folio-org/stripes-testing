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
    url: `https://folio-snapshot-okapi.dev.folio.org/${path}?${queryString}`,
    headers: {
      'x-okapi-tenant': 'diku',
      'x-okapi-token': Cypress.env('token'),
    },
    body,
  });
});
