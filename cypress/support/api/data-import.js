/// <reference types="cypress" />

import dataImportSettingsActionProfiles from '../fragments/settings/dataImport/dataImportSettingsActionProfiles';
import dataImportSettingsJobProfiles from '../fragments/settings/dataImport/dataImportSettingsJobProfiles';
import dataImportSettingsMappingProfiles from '../fragments/settings/dataImport/dataImportSettingsMappingProfiles';
import getRandomPostfix from '../utils/stringTools';

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
 * @param {Object[]} testData - Test data create and link mapping, action and job profiles.
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

  dataImportSettingsMappingProfiles.createMappingProfileApi(testData.marcBibMappingProfile).then((bodyWithMappingProfile) => {
    testData.marcBibActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    dataImportSettingsActionProfiles.createActionProfileApi(testData.marcBibActionProfile).then((bodyWithActionProfile) => {
      addJobProfileRelation(testData.jobProfileForCreate.addedRelations, bodyWithActionProfile.body.id);
    });
  });

  dataImportSettingsMappingProfiles.createMappingProfileApi(testData.instanceMappingProfile).then((bodyWithMappingProfile) => {
    testData.instanceActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    dataImportSettingsActionProfiles.createActionProfileApi(testData.instanceActionProfile).then((bodyWithActionProfile) => {
      addJobProfileRelation(testData.jobProfileForCreate.addedRelations, bodyWithActionProfile.body.id);
    });
  });

  dataImportSettingsMappingProfiles.createMappingProfileApi(testData.holdingsMappingProfile).then((bodyWithMappingProfile) => {
    testData.holdingsActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    dataImportSettingsActionProfiles.createActionProfileApi(testData.holdingsActionProfile).then((bodyWithActionProfile) => {
      addJobProfileRelation(testData.jobProfileForCreate.addedRelations, bodyWithActionProfile.body.id);
    });
  });

  dataImportSettingsMappingProfiles.createMappingProfileApi(testData.itemMappingProfile).then((bodyWithMappingProfile) => {
    testData.itemActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    dataImportSettingsActionProfiles.createActionProfileApi(testData.itemActionProfile).then((bodyWithActionProfile) => {
      addJobProfileRelation(testData.jobProfileForCreate.addedRelations, bodyWithActionProfile.body.id);
    });
  });

  dataImportSettingsJobProfiles.createJobProfileApi(testData.jobProfileForCreate)
    .then((bodyWithjobProfile) => {
      testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
    });
});

Cypress.Commands.add('createOnePairMappingAndActionProfiles', (mappingProfile, actionProfile) => {
  dataImportSettingsMappingProfiles.createMappingProfileApi(mappingProfile).then((bodyWithMappingProfile) => {
    actionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    dataImportSettingsActionProfiles.createActionProfileApi(actionProfile).then((bodyWithActionProfile) => {
      cy.wrap(bodyWithActionProfile.body.id).as('idActionProfile');
    });
  });
  return cy.get('@idActionProfile');
});

Cypress.Commands.add('getSrsRecordApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'source-storage/records',
      searchParams,
    });
});

Cypress.Commands.add('deleteSrsRecordFromStorageApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `source-storage/records/${id}`,
  });
});


