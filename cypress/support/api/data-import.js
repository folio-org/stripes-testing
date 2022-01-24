/// <reference types="cypress" />
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
    method: 'GET',
    path: 'data-import/uploadDefinitions?query=(status%3D%3D(%22NEW%22%20OR%20%22IN_PROGRESS%22%20OR%20%22LOADED%22))%20sortBy%20createdDate%2Fsort.descending&limit=1'
  });
});

/**
 * @name cy.createLinkedProfiles
 * @param {Object} testData - Test data to create and link mapping, action and job profiles.
 * @param {Object} testData.instanceMappingProfile
 * @param {Object} testData.instanceActionProfile
 * @param {Object} testData.holdingsMappingProfile
 * @param {Object} testData.holdingsActionProfile
 * @param {Object} testData.itemMappingProfile
 * @param {Object} testData.itemActionProfile
 * @param {Object} testData.jobProfileForCreate
 */
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
