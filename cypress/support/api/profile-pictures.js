Cypress.Commands.add('getProfilePictureSetting', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'user/settings?query=(key=="PROFILE_PICTURE_CONFIG")',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('updateProfilePictureSetting', (entryId, updatedBody) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `user/settings/${entryId}`,
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
    path: 'user/settings',
    body: requestBody,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('getConfigurationsEntry', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'users/configurations/entry',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  }).then(({ body }) => {
    return body;
  });
});

Cypress.Commands.add('updateConfigurationsEntry', (entryId, updatedBody) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `users/configurations/entry/${entryId}`,
    body: updatedBody,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body;
  });
});
