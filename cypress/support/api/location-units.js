Cypress.Commands.add('getInstitutionApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'location-units/institutions',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('institutions', body.institutions);
    });
});
Cypress.Commands.add('getCampusesApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'location-units/campuses',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('campuses', body.campuses);
    });
});
Cypress.Commands.add('getLibrariesApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'location-units/libraries',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('libraries', body.libraries);
    });
});
