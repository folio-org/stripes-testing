Cypress.Commands.add('getserialsByStatus', () => {
  const UpdatedUrl = encodeURI(
    'serials-management/serials?filters=serialStatus.value=active&stats=true&perPage=25&offset=0',
  );
  cy.okapiRequest({
    method: 'GET',
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getSerialsRulesets', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'serials-management/rulesets',
    isDefaultSearchParamsRequired: false,
  });
});
