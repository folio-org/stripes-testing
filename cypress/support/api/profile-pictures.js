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

Cypress.Commands.add('createProfilePictureSetting', () => {
  const requestBody = {
    scope: 'mod-users',
    key: 'PROFILE_PICTURE_CONFIG',
    value: {
      enabled: true,
      maxFileSize: 5.0,
      encryptionKey: 'ThisIsASimpleDefaultKeyToTestIts',
      enabledObjectStorage: false,
    },
  };

  cy.okapiRequest({
    method: 'POST',
    path: 'users/settings/entries',
    body: requestBody,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});
