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
