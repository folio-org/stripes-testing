Cypress.Commands.add('getLocateRtac', (instanceId) => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_EDGE_HOST')}/opac-rtac/rtac?instanceIds=${
      instanceId
    }&apiKey=${Cypress.env('LOCATE_EDGE_API_KEY')}&type=FOLIO`,
    headers: {
      'Content-type': 'application/json',
    },
  });
});

Cypress.Commands.add('getLocatePatron', (externalSystemId) => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_EDGE_HOST')}/opac-patron/account/${externalSystemId}?&apiKey=${Cypress.env('LOCATE_EDGE_API_KEY')}&type=FOLIO`,
    headers: {
      'Content-type': 'application/json',
    },
  });
});

Cypress.Commands.add('checkIdpUrl', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_IDP_URL')}`,
    headers: {},
  });
});

Cypress.Commands.add('checkLocateSourceTypeMapping', (mappingType) => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_OKAPI_HOST')}/opac-inventory/source-type-mappings/${mappingType}`,
    headers: {
      'Content-type': 'application/json',
      'x-okapi-tenant': Cypress.env('LOCATE_TENANT'),
      'x-okapi-token': Cypress.env('locate_guest_token'),
    },
  });
});

Cypress.Commands.add('checkLocateNoteTypesMappings', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_OKAPI_HOST')}/opac-inventory/note-types-mappings`,
    headers: {
      'Content-type': 'application/json',
      'x-okapi-tenant': Cypress.env('LOCATE_TENANT'),
      'x-okapi-token': Cypress.env('locate_guest_token'),
    },
  });
});

Cypress.Commands.add('checkLocateAvailabilityMappings', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_OKAPI_HOST')}/opac-rtac/v2/availability-mappings`,
    headers: {
      'Content-type': 'application/json',
      'x-okapi-tenant': Cypress.env('LOCATE_TENANT'),
      'x-okapi-token': Cypress.env('locate_guest_token'),
    },
  });
});

Cypress.Commands.add('checkLocateConfigurationFeatures', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_OKAPI_HOST')}/opac-configurations/features`,
    headers: {
      'Content-type': 'application/json',
      'x-okapi-tenant': Cypress.env('LOCATE_TENANT'),
      'x-okapi-token': Cypress.env('locate_guest_token'),
    },
  });
});
