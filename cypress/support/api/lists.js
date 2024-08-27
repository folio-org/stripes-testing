Cypress.Commands.add('getLists', () => {
  const url = '/lists?size=100';
  cy.okapiRequest({
    method: 'GET',
    path: url,
    isDefaultSearchParamsRequired: false,
  });
});
