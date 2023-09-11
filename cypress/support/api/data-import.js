/// <reference types="cypress" />
import SettingsActionProfiles from '../fragments/settings/dataImport/settingsActionProfiles';
import SettingsJobProfiles from '../fragments/settings/dataImport/settingsJobProfiles';
import SettingsMappingProfiles from '../fragments/settings/dataImport/settingsMappingProfiles';
import getRandomPostfix from '../utils/stringTools';
import { ACCEPTED_DATA_TYPE_NAMES, PROFILE_TYPE_NAMES } from '../constants';

Cypress.Commands.add('getId', () => {
  return cy.okapiRequest({
    path: 'data-import/uploadDefinitions',
    searchParams: {
      query: '(status==("NEW" OR "IN_PROGRESS" OR "LOADED")) sortBy createdDate/sort.descending',
      limit: 1,
    },
  });
});

const addJobProfileRelation = (expectedRelations, actionProfileId) => {
  const defaultJobProfileRelation = {
    masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
    detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
  };
  const newJobProfileRelation = { ...defaultJobProfileRelation };
  newJobProfileRelation.order = expectedRelations.length;
  newJobProfileRelation.detailProfileId = actionProfileId;
  expectedRelations.push(newJobProfileRelation);
};

Cypress.Commands.add('addJobProfileRelation', (expectedRelations, actionProfileId) => {
  const defaultJobProfileRelation = {
    masterProfileType: PROFILE_TYPE_NAMES.JOB_PROFILE,
    detailProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
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
      dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    },
    addedRelations: [],
    deletedRelations: [],
  };

  testData.jobProfileForCreate = jobProfile;

  SettingsMappingProfiles.createMappingProfileApi(testData.marcBibMappingProfile).then(
    (bodyWithMappingProfile) => {
      testData.marcBibActionProfile.addedRelations[0].detailProfileId =
        bodyWithMappingProfile.body.id;
      SettingsActionProfiles.createActionProfileApi(testData.marcBibActionProfile).then(
        (bodyWithActionProfile) => {
          addJobProfileRelation(
            testData.jobProfileForCreate.addedRelations,
            bodyWithActionProfile.body.id,
          );
        },
      );
    },
  );

  SettingsMappingProfiles.createMappingProfileApi(testData.instanceMappingProfile).then(
    (bodyWithMappingProfile) => {
      testData.instanceActionProfile.addedRelations[0].detailProfileId =
        bodyWithMappingProfile.body.id;
      SettingsActionProfiles.createActionProfileApi(testData.instanceActionProfile).then(
        (bodyWithActionProfile) => {
          addJobProfileRelation(
            testData.jobProfileForCreate.addedRelations,
            bodyWithActionProfile.body.id,
          );
        },
      );
    },
  );

  SettingsMappingProfiles.createMappingProfileApi(testData.holdingsMappingProfile).then(
    (bodyWithMappingProfile) => {
      testData.holdingsActionProfile.addedRelations[0].detailProfileId =
        bodyWithMappingProfile.body.id;
      SettingsActionProfiles.createActionProfileApi(testData.holdingsActionProfile).then(
        (bodyWithActionProfile) => {
          addJobProfileRelation(
            testData.jobProfileForCreate.addedRelations,
            bodyWithActionProfile.body.id,
          );
        },
      );
    },
  );

  SettingsMappingProfiles.createMappingProfileApi(testData.itemMappingProfile).then(
    (bodyWithMappingProfile) => {
      testData.itemActionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
      SettingsActionProfiles.createActionProfileApi(testData.itemActionProfile).then(
        (bodyWithActionProfile) => {
          addJobProfileRelation(
            testData.jobProfileForCreate.addedRelations,
            bodyWithActionProfile.body.id,
          );
        },
      );
    },
  );

  SettingsJobProfiles.createJobProfileApi(testData.jobProfileForCreate).then(
    (bodyWithjobProfile) => {
      testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
    },
  );
});

Cypress.Commands.add('createOnePairMappingAndActionProfiles', (mappingProfile, actionProfile) => {
  SettingsMappingProfiles.createMappingProfileApi(mappingProfile).then((bodyWithMappingProfile) => {
    actionProfile.addedRelations[0].detailProfileId = bodyWithMappingProfile.body.id;
    SettingsActionProfiles.createActionProfileApi(actionProfile).then((bodyWithActionProfile) => {
      cy.wrap(bodyWithActionProfile.body.id).as('idActionProfile');
    });
  });
  return cy.get('@idActionProfile');
});
