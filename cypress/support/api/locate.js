Cypress.Commands.add('getLocateGuestToken', () => {
  cy.request({
    method: 'GET',
    url: `${Cypress.env('LOCATE_HOST')}/opac-auth/guest-token`,
    headers: {
      'x-okapi-tenant': '',
      'Content-type': 'application/json',
    },
  });
});

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
