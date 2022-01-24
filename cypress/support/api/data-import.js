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

Cypress.Commands.add('createJobProfileApi', (jobProfile) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'data-import-profiles/jobProfiles',
    body: {
      ...jobProfile
    },
  });
});

Cypress.Commands.add('getId', () => {
  return cy.okapiRequest({
    path: 'data-import/uploadDefinitions',
    searchParams: {
      query: '(status==("NEW" OR "IN_PROGRESS" OR "LOADED")) sortBy createdDate/sort.descending',
      limit: 1
    },
  });
});


Cypress.Commands.add('createLinkedProfiles', (testData) => {
  cy.createMappingProfileApi({
    ...testData.instanceMappingProfile,
  }).then((bodyWithMappingProfile) => {
    testData.instanceActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi({
      ...testData.instanceActionProfile
    }).then((bodyWithActionProfile) => {
      testData.jobProfile.addedRelations[0].detailProfileId = bodyWithActionProfile.body.id;
    });
  });

  cy.createMappingProfileApi({
    ...testData.holdingsMappingProfile,
  }).then((bodyWithMappingProfile) => {
    testData.holdingsActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi({
      ...testData.holdingsActionProfile
    }).then((bodyWithActionProfile) => {
      testData.jobProfile.addedRelations[1].detailProfileId = bodyWithActionProfile.body.id;
    });
  });

  cy.createMappingProfileApi({
    ...testData.itemMappingProfile,
  }).then((bodyWithMappingProfile) => {
    testData.itemActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi({
      ...testData.itemActionProfile
    }).then((bodyWithActionProfile) => {
      testData.jobProfile.addedRelations[2].detailProfileId = bodyWithActionProfile.body.id;
    });
  });

  cy.createJobProfileApi({
    ...testData.jobProfile
  }).then((bodyWithjobProfile) => {
    testData.jobProfile.id = bodyWithjobProfile.body.id;
  });
});
