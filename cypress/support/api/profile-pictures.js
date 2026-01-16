Cypress.Commands.add('getProfilePictureSetting', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'users/settings/entries?query=(key=="PROFILE_PICTURE_CONFIG")',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('updateProfilePictureSetting', (entryId, updatedBody) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `users/settings/entries/${entryId}`,
    body: updatedBody,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});
