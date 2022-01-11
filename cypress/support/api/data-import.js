Cypress.Commands.add('createMappingProfileApi', (mappingProfile) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/mappingProfiles',
    body: {
      profile: { ...mappingProfile }
    },
  });
});

Cypress.Commands.add('createActionProfileApi', (actionProfile) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/actionProfiles',
    body: {
      ...actionProfile
    },
  });
});

// TODO: add custom command to job profile creation

Cypress.Commands.add('createLinkedMappingAndActionProfiles', (testData) => {
  cy.createMappingProfileApi({
    ...testData.specialMappingProfile,
  }).then((bodyWithMappingProfile) => {
    testData.specialActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi({
      ...testData.specialActionProfile
    }).then((bodyWithActionProfile) => {
      testData.specialActionProfile.id = bodyWithActionProfile.id;
    });
  });
});
