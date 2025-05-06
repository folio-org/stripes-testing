Cypress.Commands.add('checkSsoSupported', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'saml/check',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});
