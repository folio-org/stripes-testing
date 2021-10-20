Cypress.Commands.add('getAcqUnitsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'acquisitions-units/units',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('acqUnits', body.acquisitionsUnits);
    });
});
