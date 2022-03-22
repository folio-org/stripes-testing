Cypress.Commands.add('getInstitutionApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'location-units/institutions',
      searchParams,
    });
});
Cypress.Commands.add('getCampusesApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'location-units/campuses',
      searchParams,
    });
});
Cypress.Commands.add('getLibrariesApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'location-units/libraries',
      searchParams,
    });
});
