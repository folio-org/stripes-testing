Cypress.Commands.add('getOaiPmhConfigurations', (name) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'oai-pmh/configuration-settings',
    searchParams: { name },
    isDefaultSearchParamsRequired: false,
  }).then((response) => JSON.parse(response.body));
});
