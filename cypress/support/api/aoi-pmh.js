Cypress.Commands.add('getOaiPmhConfigurations', (name) => {
  cy.okapiRequest({
    method: 'GET',
    path: 'oai-pmh/configuration-settings',
    searchParams: { name },
    isDefaultSearchParamsRequired: false,
  }).then((response) => JSON.parse(response.body));
});

Cypress.Commands.add('getOaiPmhGeneralConfigViaApi', () => {
  const query = '(module==OAIPMH and configName==general)';
  cy.okapiRequest({
    method: 'GET',
    path: `configurations/entries?query=${encodeURIComponent(query)}`,
    isDefaultSearchParamsRequired: false,
  });
});
