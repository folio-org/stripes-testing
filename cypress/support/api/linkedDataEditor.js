// For *ForUser commands, the API will automatically identify the
// user ID from the folioAccessToken cookie.

Cypress.Commands.add('getProfileMetadataByResourceType', (resourceTypeURL) => {
  return cy.okapiRequest({
    method: 'GET',
    path: `linked-data/profile/metadata?resourceType=${resourceTypeURL}`,
    isDefaultSearchParamsRequired: false,
  }).then((response) => response.body);
});

Cypress.Commands.add('getAllPreferredProfilesForUser', () => {
  return cy.okapiRequest({
    method: 'GET',
    path: 'linked-data/profile/preferred',
    isDefaultSearchParamsRequired: false,
  }).then((response) => response.body);
});

Cypress.Commands.add('getPreferredProfileForUser', (resourceTypeURL) => {
  return cy.okapiRequest({
    method: 'GET',
    path: `linked-data/profile/preferred?resourceType=${resourceTypeURL}`,
    isDefaultSearchParamsRequired: false,
  }).then((response) => response.body);
});

Cypress.Commands.add('setPreferredProfileForUser', (id, resourceTypeURL) => {
  const preferredProfile = {
    id,
    resourceType: resourceTypeURL,
  };
  cy.okapiRequest({
    method: 'POST',
    path: 'linked-data/profile/preferred',
    body: preferredProfile,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('deletePreferredProfileForUser', (resourceTypeURL) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `linked-data/profile/preferred?resourceType=${resourceTypeURL}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getProfileSettingsForUser', (id) => {
  return cy.okapiRequest({
    method: 'GET',
    path: `linked-data/profile/settings/${id}`,
    isDefaultSearchParamsRequired: false,
  }).then((response) => response.body);
});

Cypress.Commands.add('setProfileSettingsForUser', (id, settings) => {
  cy.okapiRequest({
      method: 'POST',
      path: `linked-data/profile/settings/${id}`,
      body: JSON.stringify(settings),
      isDefaultSearchParamsRequired: false,
  });
});
