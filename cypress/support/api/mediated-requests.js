Cypress.Commands.add('getMediatedRequests', () => {
  const url = 'requests-mediated/mediated-requests';
  cy.okapiRequest({
    method: 'GET',
    path: url,
    isDefaultSearchParamsRequired: false,
  });
});
