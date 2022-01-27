/// <reference types="cypress" />

import getRandomPostfix from '../utils/stringTools';

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
    body: jobProfile
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

const addJobProfileRelation = (expectedRelations, actionProfileId) => {
  const defaultJobProfileRelation = {
    masterProfileType: 'JOB_PROFILE',
    detailProfileType: 'ACTION_PROFILE'
  };
  const newJobProfileRelation = { ...defaultJobProfileRelation };
  newJobProfileRelation.order = expectedRelations.length;
  newJobProfileRelation.detailProfileId = actionProfileId;
  expectedRelations.push(newJobProfileRelation);
};

Cypress.Commands.add('addJobProfileRelation', (expectedRelations, actionProfileId) => {
  const defaultJobProfileRelation = {
    masterProfileType: 'JOB_PROFILE',
    detailProfileType: 'ACTION_PROFILE'
  };
  const newJobProfileRelation = { ...defaultJobProfileRelation };
  newJobProfileRelation.order = expectedRelations.length;
  newJobProfileRelation.detailProfileId = actionProfileId;
  expectedRelations.push(newJobProfileRelation);
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
  const jobProfile = {
    profile: {
      name: `autotest_job_profile_${getRandomPostfix()}`,
      dataType: 'MARC'
    },
    addedRelations: [],
    deletedRelations: []
  };

  testData.jobProfileForCreate = jobProfile;

  cy.createMappingProfileApi(testData.instanceMappingProfile)
    .then((bodyWithMappingProfile) => {
      testData.instanceActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
      cy.createActionProfileApi(testData.instanceActionProfile)
        .then((bodyWithActionProfile) => {
          addJobProfileRelation(testData.jobProfileForCreate.addedRelations, bodyWithActionProfile.body.id);
        });
    });

  cy.createMappingProfileApi(testData.holdingsMappingProfile).then((bodyWithMappingProfile) => {
    testData.holdingsActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi(testData.holdingsActionProfile).then((bodyWithActionProfile) => {
      addJobProfileRelation(testData.jobProfileForCreate.addedRelations, bodyWithActionProfile.body.id);
    });
  });

  cy.createMappingProfileApi(testData.itemMappingProfile).then((bodyWithMappingProfile) => {
    testData.itemActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi(testData.itemActionProfile).then((bodyWithActionProfile) => {
      addJobProfileRelation(testData.jobProfileForCreate.addedRelations, bodyWithActionProfile.body.id);
    });
  });

  cy.createJobProfileApi(testData.jobProfileForCreate)
    .then((bodyWithjobProfile) => {
      testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
    });
});

Cypress.Commands.add('createOnePairMappingAndActionProfiles', (mappingProfile, actionProfile) => {
  cy.createMappingProfileApi(mappingProfile).then((bodyWithMappingProfile) => {
    actionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi(actionProfile).then((bodyWithActionProfile) => {
      cy.wrap(bodyWithActionProfile.body.id).as('idActionProfile');
    });
  });
  return cy.get('@idActionProfile');
});
