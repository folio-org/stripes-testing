Cypress.Commands.add('createMappingProfileApi', (mappingProfile) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/mappingProfiles',
    body: {
      ...mappingProfile,
    },
  });
});
