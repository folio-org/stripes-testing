Cypress.Commands.add('getAcqUnitsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'acquisitions-units/units',
    searchParams,
  });
});
