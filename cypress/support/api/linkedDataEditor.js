Cypress.Commands.add('setPrefferedProfileForUser', (userId) => {
  const prefferedProfile = {
    id: userId,
    resourceType: 'http://bibfra.me/vocab/lite/Instance',
  };
  cy.okapiRequest({
    method: 'POST',
    path: 'linked-data/profile/preferred',
    body: prefferedProfile,
  });
});
