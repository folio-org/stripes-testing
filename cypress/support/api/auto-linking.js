Cypress.Commands.add('getAllRulesViaApi', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'linking-rules/instance-authority',
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    return response.body;
  });
});

Cypress.Commands.add('setRulesForFieldViaApi', (ruleId, isEnabled) => {
  return cy.okapiRequest({
    method: 'PATCH',
    path: `linking-rules/instance-authority/${ruleId}`,
    body: {
      id: ruleId,
      autoLinkingEnabled: isEnabled,
    },
    isDefaultSearchParamsRequired: false,
  });
});
