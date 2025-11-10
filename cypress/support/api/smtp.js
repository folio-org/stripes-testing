Cypress.Commands.add('getSmtpStatus', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'smtp-configuration',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});
