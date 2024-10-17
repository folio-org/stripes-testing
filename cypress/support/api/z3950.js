Cypress.Commands.add('checkZ3950ServiceSearchAndRetrieve', () => {
  const tenantUrlPrefix = `${Cypress.config('baseUrl')}`.match(/\/\/([^.]+)\.[^]+/);
  const url =
    'https://z3950.folio.ebsco.com/' +
    tenantUrlPrefix[1] +
    `?version=1.1&operation=searchRetrieve&query=title=a&maximumRecords=1&recordSchema=raw&x-username=${Cypress.env('z3950_login')}&x-password=${Cypress.env('z3950_password')}`;
  cy.request({
    method: 'GET',
    url,
    isDefaultSearchParamsRequired: false,
  });
});
