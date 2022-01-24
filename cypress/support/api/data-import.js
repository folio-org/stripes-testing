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
Cypress.Commands.add('createLinkedProfiles', (testData, jobProfilesCount, jobPrfileName = `autotest_job_profile_${getRandomPostfix()}`) => {
  const masterProfileTypeDefaultValue = 'JOB_PROFILE';
  const detailProfileTypeDefaulValue = 'ACTION_PROFILE';
  const defaultJobProfileRelation = {
    masterProfileType: masterProfileTypeDefaultValue,
    detailProfileType: detailProfileTypeDefaulValue
  };

  const jobProfile = {
    profile: {
      name: jobPrfileName,
      dataType: 'MARC'
    },
    addedRelations: [],
    deletedRelations: []
  };

  testData.jobProfileForCreate = jobProfile;



  cy.createMappingProfileApi(testData.instanceMappingProfile)
    .then((bodyWithMappingProfile) => {
      testData.instanceActionProfile.detailProfileId = bodyWithMappingProfile.body.id;

      cy.createActionProfileApi(testData.instanceActionProfile)
        .then((bodyWithActionProfile) => {
          const newJobProfileRelation = { ...defaultJobProfileRelation };
          newJobProfileRelation.order = 0;
          newJobProfileRelation.detailProfileId = bodyWithActionProfile.body.id;
          testData.jobProfileForCreate.addedRelations.push(newJobProfileRelation);
        });
    });

  cy.createMappingProfileApi(testData.holdingsMappingProfile).then((bodyWithMappingProfile) => {
    testData.holdingsActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi(testData.holdingsActionProfile).then((bodyWithActionProfile) => {
      const newJobProfileRelation = { ...defaultJobProfileRelation };
      newJobProfileRelation.order = 1;
      newJobProfileRelation.detailProfileId = bodyWithActionProfile.body.id;
      testData.jobProfileForCreate.addedRelations.push(newJobProfileRelation);
    });
  });

  cy.createMappingProfileApi(testData.itemMappingProfile).then((bodyWithMappingProfile) => {
    testData.itemActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    cy.createActionProfileApi(testData.itemActionProfile).then((bodyWithActionProfile) => {
      const newJobProfileRelation = { ...defaultJobProfileRelation };
      newJobProfileRelation.order = 2;
      newJobProfileRelation.detailProfileId = bodyWithActionProfile.body.id;
      testData.jobProfileForCreate.addedRelations.push(newJobProfileRelation);
    });
  });

  cy.createJobProfileApi(testData.jobProfileForCreate)
    .then((bodyWithjobProfile) => {
      testData.jobProfile.id = bodyWithjobProfile.body.id;
    });
});
