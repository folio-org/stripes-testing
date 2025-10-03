Cypress.Commands.add('getAcqUnitsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'acquisitions-units/units',
    searchParams,
  });
});

Cypress.Commands.add('deleteAcqUnitApi', (unitId) => {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `acquisitions-units/units/${unitId}`,
    isDefaultSearchParams: false,
  });
});
